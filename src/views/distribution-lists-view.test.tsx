/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from 'react';

import { faker } from '@faker-js/faker';
import { waitFor } from '@testing-library/react';
import { ErrorSoapResponse, JSNS } from '@zextras/carbonio-shell-ui';
import { times } from 'lodash';
import { HttpResponse } from 'msw';
import { Link, Route } from 'react-router-dom';

import { DistributionListsView } from './distribution-lists-view';
import GroupsAppView from './GroupsAppView';
import { screen, setupTest, within } from '../carbonio-ui-commons/test/test-setup';
import { ROUTES, ROUTES_INTERNAL_PARAMS } from '../constants';
import {
	EMPTY_DISPLAYER_HINT,
	EMPTY_DISTRIBUTION_LIST_HINT,
	JEST_MOCKED_ERROR,
	TESTID_SELECTORS
} from '../constants/tests';
import { DistributionList } from '../model/distribution-list';
import { GetAccountDistributionListsResponse } from '../network/api/get-account-distribution-lists';
import { GetDistributionListResponse } from '../network/api/get-distribution-list';
import { GetDistributionListMembersResponse } from '../network/api/get-distribution-list-members';
import { registerGetAccountDistributionListsHandler } from '../tests/msw-handlers/get-account-distribution-lists';
import {
	buildGetDistributionListResponse,
	registerGetDistributionListHandler
} from '../tests/msw-handlers/get-distribution-list';
import { registerGetDistributionListMembersHandler } from '../tests/msw-handlers/get-distribution-list-members';
import {
	buildSoapError,
	buildSoapResponse,
	generateDistributionList,
	generateDistributionLists
} from '../tests/utils';

describe('Distribution Lists View', () => {
	it('should show the list of distribution lists', async () => {
		const items = generateDistributionLists(10, { isMember: true });
		registerGetAccountDistributionListsHandler(items);
		setupTest(
			<Route path={ROUTES.distributionLists}>
				<DistributionListsView />
			</Route>,
			{ initialEntries: [`/${ROUTES_INTERNAL_PARAMS.filter.member}`] }
		);
		await screen.findByText(items[0].displayName);
		items.forEach((item) => expect(screen.getByText(item.displayName)).toBeVisible());
	});

	it('should show only the list of distribution lists of which the user is owner of on manager filter', async () => {
		const dlMember = generateDistributionList({ isOwner: false, isMember: true });
		const dlOwner = generateDistributionList({ isOwner: true, isMember: false });
		registerGetAccountDistributionListsHandler([dlMember, dlOwner]);
		setupTest(<GroupsAppView />, {
			initialEntries: [
				`/${ROUTES_INTERNAL_PARAMS.route.distributionLists}/${ROUTES_INTERNAL_PARAMS.filter.manager}`
			]
		});
		expect(await screen.findByText(dlOwner.displayName)).toBeVisible();
		expect(screen.queryByText(dlMember.displayName)).not.toBeInTheDocument();
	});

	it('should render empty list message when the distribution list is empty', async () => {
		const handler = registerGetAccountDistributionListsHandler([]);
		setupTest(
			<Route path={ROUTES.distributionLists}>
				<DistributionListsView />
			</Route>,
			{
				initialEntries: [`/${ROUTES_INTERNAL_PARAMS.filter.member}`]
			}
		);
		await waitFor(() => expect(handler).toHaveBeenCalled());
		expect(screen.getByText(EMPTY_DISTRIBUTION_LIST_HINT)).toBeVisible();
	});

	it('should only ask data once to the network and show list immediately when navigating on a different filter', async () => {
		const memberList = generateDistributionLists(1, { isMember: true, isOwner: false });
		const managerList = generateDistributionLists(1, { isOwner: true, isMember: false });
		const getAccountDLHandler = registerGetAccountDistributionListsHandler([]);
		getAccountDLHandler.mockImplementationOnce(async ({ request }) => {
			const {
				Body: {
					GetAccountDistributionListsRequest: { ownerOf, memberOf }
				}
			} = await request.json();
			const resData: DistributionList[] = [];
			if (ownerOf) {
				resData.push(...managerList);
			}
			if (memberOf !== 'none') {
				resData.push(...memberList);
			}

			return HttpResponse.json(
				buildSoapResponse<GetAccountDistributionListsResponse>({
					GetAccountDistributionListsResponse: {
						_jsns: JSNS.account,
						dl: resData.map((item) => ({
							id: item.id,
							name: item.email,
							d: item.displayName,
							isOwner: item.isOwner,
							isMember: item.isMember
						}))
					}
				})
			);
		});

		const { user } = setupTest(
			<>
				<Link to={`/${ROUTES_INTERNAL_PARAMS.filter.manager}`}>Manager</Link>
				<Route path={ROUTES.distributionLists}>
					<DistributionListsView />
				</Route>
			</>,
			{
				initialEntries: [`/${ROUTES_INTERNAL_PARAMS.filter.member}`]
			}
		);
		expect(await screen.findByText(memberList[0].displayName)).toBeVisible();
		await user.click(screen.getByRole('link', { name: 'Manager' }));
		// FIXME: for some reason, something to "slow down"
		//  the test is needed to allow react to update the ui,
		//  and make the following waitFor work even when run with all other tests
		await waitFor(
			() =>
				new Promise((resolve) => {
					setTimeout(resolve, 0);
				})
		);
		await waitFor(() =>
			expect(screen.queryByText(memberList[0].displayName)).not.toBeInTheDocument()
		);
		expect(await screen.findByText(managerList[0].displayName)).toBeVisible();
		expect(getAccountDLHandler).toHaveBeenCalledTimes(1);
	});

	it('should show an error snackbar if there is a network error while loading the list', async () => {
		registerGetAccountDistributionListsHandler([], JEST_MOCKED_ERROR);
		setupTest(
			<Route path={ROUTES.distributionLists}>
				<DistributionListsView />
			</Route>,
			{
				initialEntries: [`/${ROUTES_INTERNAL_PARAMS.filter.member}/`]
			}
		);
		expect(await screen.findByText(/something went wrong/i)).toBeVisible();
	});

	it('should show edit action on item of which the user is also owner, inside the member filter', async () => {
		const dl = generateDistributionList({ isOwner: true, isMember: true });
		registerGetAccountDistributionListsHandler([dl]);
		const { user } = setupTest(
			<Route path={ROUTES.distributionLists}>
				<DistributionListsView />
			</Route>,
			{ initialEntries: [`/${ROUTES_INTERNAL_PARAMS.filter.member}`] }
		);
		const listItem = await screen.findByText(dl.displayName);
		expect(
			screen.getByRoleWithIcon('button', { icon: TESTID_SELECTORS.icons.editDL })
		).toBeVisible();
		await user.rightClick(listItem);
		expect(
			within(await screen.findByTestId(TESTID_SELECTORS.dropdownList)).getByText('Edit')
		).toBeVisible();
	});

	describe('Displayer', () => {
		beforeEach(() => {
			registerGetDistributionListMembersHandler([]);
		});
		it('should open the displayer when click on a distribution list item', async () => {
			const dl = generateDistributionList({ isMember: true });
			registerGetAccountDistributionListsHandler([dl]);
			registerGetDistributionListHandler(dl);

			const { user } = setupTest(
				<Route path={`${ROUTES.mainRoute}${ROUTES.distributionLists}`}>
					<DistributionListsView />
				</Route>,
				{
					initialEntries: [
						`/${ROUTES_INTERNAL_PARAMS.route.distributionLists}/${ROUTES_INTERNAL_PARAMS.filter.member}`
					]
				}
			);

			await user.click(await screen.findByText(dl.displayName));
			await within(screen.getByTestId(TESTID_SELECTORS.displayer)).findAllByTestId(
				TESTID_SELECTORS.icons.distributionList
			);
			expect(
				await within(screen.getByTestId(TESTID_SELECTORS.displayer)).findAllByText(dl.displayName)
			).toHaveLength(2);
		});

		it('should close the displayer when click on close', async () => {
			const dl = generateDistributionList({ isMember: true });
			registerGetAccountDistributionListsHandler([dl]);
			registerGetDistributionListHandler(dl);

			const { user } = setupTest(
				<Route path={`${ROUTES.mainRoute}${ROUTES.distributionLists}`}>
					<DistributionListsView />
				</Route>,
				{
					initialEntries: [
						`/${ROUTES_INTERNAL_PARAMS.route.distributionLists}/${ROUTES_INTERNAL_PARAMS.filter.member}/${dl.id}`
					]
				}
			);

			const displayerHeader = await screen.findByTestId(TESTID_SELECTORS.displayerHeader);
			const closeAction = await within(displayerHeader).findByRoleWithIcon('button', {
				icon: TESTID_SELECTORS.icons.closeDisplayer
			});
			await within(displayerHeader).findByText(dl.displayName);
			await user.click(closeAction);
			expect(await screen.findByText(EMPTY_DISPLAYER_HINT)).toBeVisible();
		});

		it('should show only members of the new active distribution list starting from first page when setting a different distribution list as active with the displayer already open', async () => {
			const dl1 = generateDistributionList({ isMember: true });
			const dl2 = generateDistributionList({ isMember: true });
			registerGetAccountDistributionListsHandler([dl1, dl2]);
			const getDLHandler = registerGetDistributionListHandler(dl1);
			getDLHandler.mockImplementation(async ({ request }) => {
				const {
					Body: {
						GetDistributionListRequest: {
							dl: { _content }
						}
					}
				} = await request.json();
				let resData: DistributionList | undefined;
				if (_content === dl1.id || _content === dl1.email) {
					resData = dl1;
				}
				if (_content === dl2.id || _content === dl2.email) {
					resData = dl2;
				}

				if (resData === undefined) {
					return HttpResponse.json(buildSoapError('DL not found'));
				}

				return HttpResponse.json(
					buildSoapResponse<GetDistributionListResponse>({
						GetDistributionListResponse: buildGetDistributionListResponse(resData)
					})
				);
			});

			const dl1Members = times(7, () => faker.internet.email());
			const dl2Members = times(10, () => faker.internet.email());

			const getMembersHandler = registerGetDistributionListMembersHandler();
			getMembersHandler.mockImplementation(async ({ request }) => {
				const {
					Body: {
						GetDistributionListMembersRequest: {
							dl: { _content },
							offset
						}
					}
				} = await request.json();

				if (_content === dl2.email && offset !== 0) {
					return HttpResponse.json(
						buildSoapError('Received offset greater than 0 while loading first page of dl2')
					);
				}
				let data: Array<string> | undefined;
				if (_content === dl1.email) {
					data = dl1Members;
				}
				if (_content === dl2.email) {
					data = dl2Members;
				}
				if (data === undefined) {
					return HttpResponse.json<ErrorSoapResponse>(
						buildSoapError('DL not found while loading members')
					);
				}
				return HttpResponse.json(
					buildSoapResponse<GetDistributionListMembersResponse>({
						GetDistributionListMembersResponse: {
							_jsns: JSNS.account,
							dlm: data.map((item) => ({ _content: item })),
							more: false,
							total: data.length
						}
					})
				);
			});

			const { user } = setupTest(
				<Route path={`${ROUTES.mainRoute}${ROUTES.distributionLists}`}>
					<DistributionListsView />
				</Route>,
				{
					initialEntries: [
						`/${ROUTES_INTERNAL_PARAMS.route.distributionLists}/${ROUTES_INTERNAL_PARAMS.filter.member}/${dl1.id}`
					]
				}
			);

			await screen.findByText(dl2.displayName);
			await screen.findByTestId(TESTID_SELECTORS.displayer);
			await user.click(await screen.findByText(/member list/i));
			await screen.findByText(dl1Members[0]);
			await user.click(screen.getByText(dl2.displayName));
			expect(
				await within(screen.getByTestId(TESTID_SELECTORS.displayer)).findAllByText(dl2.displayName)
			).toHaveLength(2);
			await user.click(screen.getByText(/member list/i));
			expect(await screen.findByText(dl2Members[0])).toBeVisible();
			expect(screen.getByText(/member list 10/i)).toBeVisible();
			expect(screen.queryByText(dl1Members[0])).not.toBeInTheDocument();
		});

		it('should reset tabs and show details when changing active item', async () => {
			const dl1 = generateDistributionList({ isMember: true, description: 'description 1' });
			const dl2 = generateDistributionList({ isMember: true, description: 'description 2' });
			registerGetAccountDistributionListsHandler([dl1, dl2]);
			registerGetDistributionListHandler(dl1).mockImplementation(async ({ request }) => {
				const {
					Body: {
						GetDistributionListRequest: {
							dl: { _content }
						}
					}
				} = await request.json();

				const response = _content === dl1.id || _content === dl1.email ? dl1 : dl2;
				return HttpResponse.json(
					buildSoapResponse({
						GetDistributionListResponse: buildGetDistributionListResponse(response)
					})
				);
			});

			const { user } = setupTest(
				<Route path={`${ROUTES.mainRoute}${ROUTES.distributionLists}`}>
					<DistributionListsView />
				</Route>,
				{
					initialEntries: [
						`/${ROUTES_INTERNAL_PARAMS.route.distributionLists}/${ROUTES_INTERNAL_PARAMS.filter.member}`
					]
				}
			);

			await user.click(await screen.findByText(dl1.displayName));
			await screen.findByText(dl1.description as string);
			// navigate to a different tab
			await user.click(screen.getByText(/manager list/i));
			await waitFor(() =>
				expect(screen.queryByText(dl1.description as string)).not.toBeInTheDocument()
			);
			// change active item
			await user.click(screen.getByText(dl2.displayName));
			// description inside details tab is visible for dl2. Tab has been reset
			expect(await screen.findByText(dl2.description as string)).toBeVisible();
		});
	});
});
