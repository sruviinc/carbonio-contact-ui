/*
 * SPDX-FileCopyrightText: 2024 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React, { FC, useCallback, useRef } from 'react';

import { Container, ListItem, ListV2 } from '@zextras/carbonio-design-system';
import { groupBy } from 'lodash';
import styled from 'styled-components';

import { UsersSharesListItem } from './users-shares-list-item';
import { ShareInfo } from '../../../model/share-info';

export type UsersSharesListProps = {
	shares: Array<ShareInfo>;
	onSelectionChange: (selected: Array<ShareInfo>) => void;
};

const CustomListItem = styled(ListItem)`
	&:hover {
		background-color: ${({ theme, active }): string => theme.palette.transparent.regular}
`;

export const UsersSharesList: FC<UsersSharesListProps> = ({ shares, onSelectionChange }) => {
	// Group shares by owner's name
	const sharesGroups = groupBy(shares, (share) => share.ownerName);
	const ownerNames = Object.keys(sharesGroups);
	const selectionRef = useRef<Array<ShareInfo>>([]);

	const onSelect = useCallback(
		(share: ShareInfo) => {
			const shareIndex = selectionRef.current.indexOf(share);
			if (shareIndex >= 0) {
				return;
			}
			selectionRef.current.push(share);
			onSelectionChange(selectionRef.current);
		},
		[onSelectionChange]
	);

	const onDeselect = useCallback(
		(share: ShareInfo) => {
			const shareIndex = selectionRef.current.indexOf(share);
			if (shareIndex < 0) {
				return;
			}
			selectionRef.current.splice(shareIndex, 1);
			onSelectionChange(selectionRef.current);
		},
		[onSelectionChange]
	);

	return (
		<Container mainAlignment={'flex-start'}>
			<ListV2>
				{ownerNames.map((ownerName, index) => (
					<CustomListItem key={index}>
						{(visible: boolean): React.JSX.Element =>
							visible ? (
								<UsersSharesListItem
									shares={sharesGroups[ownerName]}
									ownerName={ownerName}
									onSelect={onSelect}
									onDeselect={onDeselect}
								/>
							) : (
								<></>
							)
						}
					</CustomListItem>
				))}
			</ListV2>
		</Container>
	);
};
