/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { faker } from '@faker-js/faker';
import { act } from '@testing-library/react';
import { ErrorSoapBodyResponse, JSNS } from '@zextras/carbonio-shell-ui';
import { times } from 'lodash';

import { useActionMoveContacts } from './move-contacts';
import { UIAction } from './types';
import { isLink, isSystemFolder } from '../carbonio-ui-commons/helpers/folders';
import { getFolder } from '../carbonio-ui-commons/store/zustand/folder';
import { FOLDERS } from '../carbonio-ui-commons/test/mocks/carbonio-shell-ui-constants';
import { createSoapAPIInterceptor } from '../carbonio-ui-commons/test/mocks/network/msw/create-api-interceptor';
import { populateFoldersStore } from '../carbonio-ui-commons/test/mocks/store/folders';
import {
	setupHook,
	screen,
	makeListItemsVisible,
	within
} from '../carbonio-ui-commons/test/test-setup';
import { FOLDERS_DESCRIPTORS, TIMERS } from '../constants/tests';
import { Contact } from '../legacy/types/contact';
import { ContactActionRequest } from '../legacy/types/soap';
import { ContactActionResponse } from '../network/api/contact-action';
import { buildContact } from '../tests/model-builder';
import { getFoldersArray } from '../tests/utils';

describe('useActionMoveContacts', () => {
	it('should return an object with the specific data', () => {
		const { result } = setupHook(useActionMoveContacts);
		expect(result.current).toEqual<UIAction<unknown, unknown>>(
			expect.objectContaining({
				icon: 'MoveOutline',
				label: 'Move',
				id: 'move-contacts-action'
			})
		);
	});

	describe('canExecute', () => {
		test.each`
			folder
			${FOLDERS_DESCRIPTORS.contacts}
			${FOLDERS_DESCRIPTORS.autoContacts}
			${FOLDERS_DESCRIPTORS.trash}
		`(`should return true if the destination address book is $folder.desc`, ({ folder }) => {
			populateFoldersStore();
			const addressBook = getFolder(folder.id);
			if (!addressBook) {
				throw new Error(`Cannot find address book ${folder.desc}`);
			}

			const currentParentFolder = getFoldersArray().find(
				(folder) => folder.view === 'contact' && !isSystemFolder(folder.id)
			);
			if (!currentParentFolder) {
				throw new Error(`Cannot find the current address book`);
			}

			const contacts = [buildContact({ parent: currentParentFolder.id })];
			const { result } = setupHook(useActionMoveContacts);
			const action = result.current;
			expect(action.canExecute({ contacts, newParentAddressBook: addressBook })).toBeTruthy();
		});

		it('should return true if the address book is a linked one', () => {
			populateFoldersStore();
			const linkedFolder = getFoldersArray().find(
				(folder) => folder.view === 'contact' && isLink(folder)
			);
			if (!linkedFolder) {
				throw new Error(`Cannot find a linked address book`);
			}
			const contacts = [buildContact()];
			const { result } = setupHook(useActionMoveContacts);
			const action = result.current;
			expect(action.canExecute({ contacts, newParentAddressBook: linkedFolder })).toBeTruthy();
		});

		it('should return false if all contacts already belong to the destination address book', () => {
			populateFoldersStore();
			const newParentAddressBook = getFolder(FOLDERS.CONTACTS);
			const contacts = times(10, () => buildContact({ parent: newParentAddressBook?.id }));

			const { result } = setupHook(useActionMoveContacts);
			const action = result.current;
			expect(action.canExecute({ contacts, newParentAddressBook })).toBeFalsy();
		});

		it("should return true if at least one contact doesn't already belong to the destination address book", () => {
			populateFoldersStore();
			const newParentAddressBook = getFolder(FOLDERS.CONTACTS);
			const contacts = times(10, () => buildContact({ parent: newParentAddressBook?.id }));
			contacts[4].parent = FOLDERS.AUTO_CONTACTS;

			const { result } = setupHook(useActionMoveContacts);
			const action = result.current;
			expect(action.canExecute({ contacts, newParentAddressBook })).toBeTruthy();
		});
	});

	describe('Execute', () => {
		describe('Execute without setting a destination address book', () => {
			it('should call open a modal with a specific title', () => {
				populateFoldersStore();
				const newParentAddressBook = getFolder(FOLDERS.CONTACTS);
				const contacts = times(10, () => buildContact({ parent: newParentAddressBook?.id }));

				const { result } = setupHook(useActionMoveContacts);
				const action = result.current;
				act(() => {
					action.execute({ contacts });
				});

				act(() => {
					jest.advanceTimersByTime(TIMERS.modal.delayOpen);
				});

				expect(screen.getByText(`Move ${contacts.length} contacts`)).toBeVisible();
			});

			it("shouldn't open a modal if the action cannot be executed", () => {
				populateFoldersStore();
				const contacts: Array<Contact> = [];
				const { result } = setupHook(useActionMoveContacts);
				const action = result.current;
				act(() => {
					action.execute({ contacts });
				});

				act(() => {
					jest.advanceTimersByTime(TIMERS.modal.delayOpen);
				});

				expect(screen.queryByRole('button', { name: 'Move' })).not.toBeInTheDocument();
			});

			// FIXME try to understand why it is not clicking on the accordion item
			it.skip('should call the FolderAction API with the proper parameters', async () => {
				populateFoldersStore();
				const apiInterceptor = createSoapAPIInterceptor<ContactActionRequest, never>(
					'ContactAction'
				);
				const contact = buildContact({ parent: FOLDERS.AUTO_CONTACTS });
				const { user, result } = setupHook(useActionMoveContacts);
				const action = result.current;
				await act(async () => {
					action.execute({ contacts: [contact] });
				});

				act(() => {
					jest.advanceTimersByTime(TIMERS.modal.delayOpen);
				});

				const moveButton = screen.getByRole('button', { name: 'Move' });
				makeListItemsVisible();
				const newParentListItem = within(screen.getByTestId('folder-accordion-item-7')).getByText(
					'Contacts'
				);
				await act(async () => user.click(newParentListItem));
				await act(async () => user.click(moveButton));

				await expect(apiInterceptor).resolves.toEqual(
					expect.objectContaining({
						action: expect.objectContaining({ op: 'move', id: contact.id, l: FOLDERS.USER_ROOT })
					})
				);
			});
		});

		describe('Execute with a given destination address book', () => {
			it('should call the FolderAction API with the proper parameters', async () => {
				populateFoldersStore();
				const newParentAddressBook = getFolder(FOLDERS.AUTO_CONTACTS);
				const apiInterceptor = createSoapAPIInterceptor<ContactActionRequest, never>(
					'ContactAction'
				);
				const contact = buildContact({ parent: FOLDERS.CONTACTS });
				const { result } = setupHook(useActionMoveContacts);
				const action = result.current;
				await act(async () => {
					action.execute({ contacts: [contact], newParentAddressBook });
				});

				await expect(apiInterceptor).resolves.toEqual(
					expect.objectContaining({
						action: expect.objectContaining({
							op: 'move',
							id: contact.id,
							l: FOLDERS.AUTO_CONTACTS
						})
					})
				);
			});

			it('should display a success snackbar if the API returns success', async () => {
				populateFoldersStore();
				const contact = buildContact();
				const newParentAddressBook = getFolder(FOLDERS.AUTO_CONTACTS);

				const response: ContactActionResponse = {
					action: {
						id: contact.id,
						op: 'move'
					},
					_jsns: JSNS.mail
				};

				createSoapAPIInterceptor<ContactActionRequest, ContactActionResponse>(
					'ContactAction',
					response
				);

				const { result } = setupHook(useActionMoveContacts);
				const action = result.current;
				await act(async () => {
					action.execute({ contacts: [contact], newParentAddressBook });
				});

				expect(screen.getByText('Contact moved')).toBeVisible();
			});

			it('should display an error snackbar if the API returns error', async () => {
				populateFoldersStore();
				const contact = buildContact();
				const newParentAddressBook = getFolder(FOLDERS.AUTO_CONTACTS);

				const response: ErrorSoapBodyResponse = {
					Fault: {
						Detail: { Error: { Code: faker.string.uuid(), Detail: faker.word.preposition() } },
						Reason: { Text: faker.word.sample() }
					}
				};

				createSoapAPIInterceptor<ContactActionRequest, ErrorSoapBodyResponse>(
					'ContactAction',
					response
				);

				const { result } = setupHook(useActionMoveContacts);
				const action = result.current;
				await act(async () => {
					action.execute({ contacts: [contact], newParentAddressBook });
				});

				expect(screen.getByText('Something went wrong, please try again')).toBeVisible();
			});
		});
	});
});
