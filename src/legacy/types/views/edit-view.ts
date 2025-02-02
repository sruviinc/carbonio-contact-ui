/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { BoardViewComponentProps } from '@zextras/carbonio-shell-ui';

export type EditViewProps = BoardViewComponentProps & {
	panel?: boolean;
	onClose?: () => void;
	onTitleChanged?: (title: string) => void;
	editPanelId?: string;
	folderId?: string;
};
