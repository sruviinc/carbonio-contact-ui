/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';

import {
	Divider,
	Icon,
	Input,
	InputProps,
	ModalFooter,
	ModalHeader,
	Row,
	Text,
	useSnackbar
} from '@zextras/carbonio-design-system';
import { last } from 'lodash';
import { useTranslation } from 'react-i18next';

import { UsersSharesList } from './users-shares-list';
import { getFolderIdParts } from '../../../carbonio-ui-commons/helpers/folders';
import { TIMEOUTS } from '../../../constants';
import { getFolderTranslatedName } from '../../../legacy/utils/helpers';
import { ShareInfo } from '../../../model/share-info';
import { apiClient } from '../../../network/api-client';
import { ScrollableContainer } from '../../styled-components';

export type SharesModalProps = {
	onClose: () => void;
};

export const SharedAddressBooksAddModal: FC<SharesModalProps> = ({ onClose }) => {
	const [t] = useTranslation();
	const createSnackbar = useSnackbar();
	const [sharesInfo, setSharesInfo] = useState<Array<ShareInfo>>([]);
	const [selectedShares, setSelectedShares] = useState<Array<ShareInfo>>([]);
	const [ownerNameFilter, setOwnerNameFilter] = useState<string>('');

	// Fetch the list of the shares
	useEffect(() => {
		apiClient
			.getShareInfo()
			.then((shares) => {
				setSharesInfo(shares ?? []);
			})
			.catch(() => {
				createSnackbar({
					key: `getShareInfo-error-${new Date().toDateString()}`,
					replace: true,
					type: 'error',
					label: t('label.error_try_again', 'Something went wrong, please try again'),
					autoHideTimeout: TIMEOUTS.defaultSnackbar,
					hideButton: true
				});
			});
	}, [createSnackbar, t]);

	const onOwnerNameFilterChange = useCallback<NonNullable<InputProps['onChange']>>((ev) => {
		setOwnerNameFilter(ev.target.value.trim().toLowerCase());
	}, []);

	const filteredSharedInfo = useMemo<Array<ShareInfo>>(
		() => [
			...sharesInfo.filter(
				(share) =>
					ownerNameFilter === '' || share.ownerName?.toLowerCase().startsWith(ownerNameFilter)
			)
		],
		[ownerNameFilter, sharesInfo]
	);

	const onSharesSelection = useCallback((selection: Array<ShareInfo>) => {
		setSelectedShares([...selection]);
	}, []);

	const onConfirm = useCallback(() => {
		// TODO this is taken from the UsersSharesListItem component: consider to move it into a function/hook
		const labeledShares = selectedShares.map((share) => {
			const baseName = last(share.folderPath.split('/')) ?? '';
			const folderId = getFolderIdParts(share.folderId).id ?? '';
			const shareLocalizedBaseName = getFolderTranslatedName(t, folderId, baseName);
			return {
				...share,
				mountpointName: t('share.link_name', {
					shareName: shareLocalizedBaseName,
					ownerName: share.ownerName,
					defaultValue: '{{shareName}} of {{ownerName}}'
				})
			};
		});

		apiClient
			.createMountpoints(labeledShares)
			.then(() => {
				createSnackbar({
					key: `share`,
					replace: true,
					type: 'info',
					hideButton: true,
					label: t('share.share_added_succesfully', 'Shared added successfully'),
					autoHideTimeout: TIMEOUTS.defaultSnackbar
				});
				onClose();
			})
			.catch(() => {
				createSnackbar({
					key: `share`,
					replace: true,
					type: 'error',
					hideButton: true,
					label: t('label.error_try_again', 'Something went wrong, please try again'),
					autoHideTimeout: TIMEOUTS.defaultSnackbar
				});
			});
	}, [createSnackbar, onClose, selectedShares, t]);

	const isAddButtonDisabled = useMemo<boolean>(
		() => selectedShares.length === 0,
		[selectedShares.length]
	);

	return (
		<>
			<ModalHeader
				title={t('share.find_contact_shares', 'Find Contact Shares')}
				showCloseIcon
				onClose={onClose}
			/>
			<Divider />
			<Row padding={{ top: 'large', bottom: 'small' }} width="fill" mainAlignment="flex-start">
				<Text>
					{t(
						'share.find_shares_label',
						'Select which address book you want to see in contact’s tree'
					)}
				</Text>
			</Row>
			<Row padding={{ top: 'small', bottom: 'large' }} width="fill">
				<Input
					data-testid={'find-users-filter-input'}
					label={t('share.filter_user', 'Find users')}
					backgroundColor="gray5"
					CustomIcon={({ hasFocus }): React.JSX.Element => (
						<Icon icon="FunnelOutline" size="large" color={hasFocus ? 'primary' : 'text'} />
					)}
					value={ownerNameFilter}
					onChange={onOwnerNameFilterChange}
				/>
			</Row>
			<ScrollableContainer orientation="vertical" mainAlignment="flex-start" minHeight={'6rem'}>
				<UsersSharesList shares={filteredSharedInfo} onSelectionChange={onSharesSelection} />
			</ScrollableContainer>
			<Divider />
			<ModalFooter
				onConfirm={onConfirm}
				confirmLabel={t('share.add', 'Add')}
				confirmDisabled={isAddButtonDisabled}
			/>
		</>
	);
};
