/*
 * SPDX-FileCopyrightText: 2021 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { Suspense, lazy, useState, useEffect } from 'react';

import { Container } from '@zextras/carbonio-design-system';
import { setAppContext, Spinner } from '@zextras/carbonio-shell-ui';
import { Redirect, Switch, Route, useRouteMatch } from 'react-router-dom';

import { useUpdateView } from '../../carbonio-ui-commons/hooks/use-update-view';
import { Close, PeopleAltRounded } from '@mui/icons-material';
import { Divider, Grid, IconButton, Modal, Paper, Typography } from '@mui/material';
import Desktop from '../../sruvi/Desktop';
import VeryLarge from '../../sruvi/VeryLarge';
import Mobile from '../../sruvi/Mobile';

const LazyFolderView = lazy(
	() => import(/* webpackChunkName: "folder-view" */ './app/folder-panel')
);

const LazyDetailPanel = lazy(
	() => import(/* webpackChunkName: "folder-panel-view" */ './app/detail-panel')
);

const AppView = () => {
	const { path } = useRouteMatch();
	const [count, setCount] = useState(0);
	useUpdateView();

	useEffect(() => {
		setAppContext({ count, setCount });
	}, [count]);

	const [mobile, setmobile] = useState(false);

	return (
		<div style={{ height: '100%', width: '100%', overflow: 'hidden' }}>
			<Grid container sx={{ width: '100%', height: '100%' }}>
				<Grid item xs={12}>
					<div
						style={{
							display: 'flex',
							flexDirection: 'row',
							alignItems: 'center',
							padding: '16px',
							position: 'sticky'
						}}
					>
						<PeopleAltRounded style={{ height: '40px' }} />
						<Typography variant="body1">Contacts</Typography>
					</div>
				</Grid>
				<Grid item xs={12} sx={{ height: 'calc(100% - 72px)' }}>
					<div style={{ height: '100%', width: '100%' }}>
						<Desktop>
							<Grid container sx={{ width: '100%', height: '100%' }}>
								<Grid item xs={4}>
									<Paper
										variant="outlined"
										style={{
											height: '100%'
										}}
									>
										<Switch>
											<Route path={`${path}/folder/:folderId/:type?/:itemId?`}>
												<Suspense fallback={<Spinner />}>
													<LazyFolderView />
												</Suspense>
											</Route>
											<Redirect strict from={path} to={`${path}/folder/7`} />
										</Switch>
									</Paper>
								</Grid>
								<Grid item xs={8}>
									<div style={{ height: '100%', width: '100%' }}>
										<Suspense fallback={<Spinner />}>
											<LazyDetailPanel />
										</Suspense>
									</div>
								</Grid>
							</Grid>
						</Desktop>
						<VeryLarge>
							<Grid container sx={{ width: '100%', height: '100%' }}>
								<Grid item xs={3}>
									<Paper
										variant="outlined"
										style={{
											height: '100%'
										}}
									>
										<Switch>
											<Route path={`${path}/folder/:folderId/:type?/:itemId?`}>
												<Suspense fallback={<Spinner />}>
													<LazyFolderView />
												</Suspense>
											</Route>
											<Redirect strict from={path} to={`${path}/folder/7`} />
										</Switch>
									</Paper>
								</Grid>
								<Grid item xs={9}>
									<div style={{ height: '100%', width: '100%' }}>
										<Suspense fallback={<Spinner />}>
											<LazyDetailPanel />
										</Suspense>
									</div>
								</Grid>
							</Grid>
						</VeryLarge>
						<Mobile>
							<Grid container sx={{ width: '100%', height: '100%' }}>
								<Grid item xs={12}>
									<Paper
										variant="outlined"
										style={{
											height: '100%'
										}}
									>
										<Switch>
											<Route path={`${path}/folder/:folderId/:type?/:itemId?`}>
												<Suspense fallback={<Spinner />}>
													<div
														onClick={() => {
															setmobile(!mobile);
														}}
													>
														<LazyFolderView />
													</div>
												</Suspense>
											</Route>
											<Redirect strict from={path} to={`${path}/folder/7`} />
										</Switch>
									</Paper>
								</Grid>
								<Modal open={mobile} onClose={!mobile}>
									<div style={{ height: '100vh', width: '100vw', backgroundColor: 'white' }}>
										<div>
											<IconButton
												onClick={() => {
													setmobile(false);
												}}
											>
												<Close />
											</IconButton>
											<Suspense fallback={<Spinner />}>
												<LazyDetailPanel />
											</Suspense>
										</div>
									</div>
								</Modal>
							</Grid>
						</Mobile>
					</div>
				</Grid>
			</Grid>
		</div>

		// <Container orientation="horizontal" mainAlignment="flex-start">
		// 	<Container width="40%">
		// 		<Switch>
		// 			<Route path={`${path}/folder/:folderId/:type?/:itemId?`}>
		// 				<Suspense fallback={<Spinner />}>
		// 					<LazyFolderView />
		// 				</Suspense>
		// 			</Route>
		// 			<Redirect strict from={path} to={`${path}/folder/7`} />
		// 		</Switch>
		// 	</Container>
		// 	<Suspense fallback={<Spinner />}>
		// 		<LazyDetailPanel />
		// 	</Suspense>
		// </Container>
	);
};

export default AppView;
<div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
	<PeopleAltRounded />
	<Typography variant="body1">Contacts</Typography>
</div>;
