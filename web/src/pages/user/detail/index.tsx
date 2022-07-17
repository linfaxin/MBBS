import React, { useLayoutEffect } from 'react';
import { history, useModel } from 'umi';
import EditIcon from '@mui/icons-material/Edit';
import { Button, IconButton, List, ListItem, ListItemButton, ListItemText, ListSubheader, useTheme } from '@mui/material';
import OpenPromptDialog from '@/components/open-prompt-dialog';
import doTaskWithUI from '@/utils/do-task-with-ui';
import { groupApi, permissionApi, userApi } from '@/api';
import UploadResourceButton from '@/components/upload-resource-button';
import { getResourceUrl } from '@/utils/resource-url';
import { compressImageFile } from '@/utils/compress-image-util';
import { ENUM_MAP_USER_STATE, UserStatusCanChangeToMap } from '@/consts';
import { formatTime } from '@/utils/format-util';
import { User, UserStatus } from '@/api/base/user';
import { useRequest } from 'ahooks';
import showSnackbar from '@/utils/show-snackbar';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import AppPage from '@/components/app-page';
import { usePageState } from '@/utils/use-page-history-hooks';
import ApiUI from '@/api-ui';
import showAlert from '@/utils/show-alert';

export default function UserDetailPage() {
  const { user: loginUser } = useModel('useLoginUser');
  const { id } = history.location.query || {};
  const theme = useTheme();
  const [user, setUser] = usePageState<User>(`user-${id}`, {} as User);
  const { data: myPermissions } = useRequest(() => (loginUser ? permissionApi.getMyPermissions() : Promise.resolve([])), {
    refreshDeps: [loginUser?.id],
  });
  const { data: groups } = useRequest(() => groupApi.listGroup());

  if (ApiUI.onShowUserInfoPage) {
    return (
      <AppPage
        title="个人详情"
        contentSx={{ paddingTop: 2, paddingBottom: 2, textAlign: 'center' }}
        initPage={async () => {
          const user = await userApi.getUserById(String(id));
          setUser(user);
          if (user && ApiUI.onShowUserInfoPage) {
            ApiUI.onShowUserInfoPage(user);
          }
        }}
        showInitPageLoading={!user}
      >
        <Button variant="outlined" onClick={() => ApiUI.onShowUserInfoPage?.(user)}>
          查看个人详情
        </Button>
      </AppPage>
    );
  }

  return (
    <AppPage
      title="个人详情"
      contentSx={{ paddingTop: 2, paddingBottom: 2 }}
      initPage={async () => {
        setUser(await userApi.getUserById(String(id)));
      }}
      showInitPageLoading={!user}
    >
      <List
        sx={{ background: theme.palette.background.paper }}
        component="nav"
        subheader={<ListSubheader component="div">个人信息</ListSubheader>}
      >
        <ListItem>
          <ListItemText
            sx={{ paddingLeft: 2 }}
            primary={
              <img
                alt="avatar"
                src={getResourceUrl(user.avatar) || require('@/images/default-avatar.png')}
                style={{ width: 80, height: 80, cursor: 'pointer' }}
                onClick={() => {
                  showAlert({
                    title: '查看大图',
                    message: (
                      <img style={{ width: '100%' }} src={getResourceUrl(user.avatar) || require('@/images/default-avatar.png')} alt="" />
                    ),
                  });
                }}
              />
            }
          />
          {myPermissions?.includes('user.edit.base') && (
            <UploadResourceButton
              startIcon={<EditIcon />}
              beforeUpload={(file) => compressImageFile(file, { maxWidth: 192, maxHeight: 192 })}
              onUploaded={async (result) => {
                const modifiedUser = await userApi.modifyUser({ id: user.id, avatar: result.filePath });
                setUser(modifiedUser);
                showSnackbar('修改成功');
              }}
            >
              修改头像
            </UploadResourceButton>
          )}
        </ListItem>
        <ListItem>
          <ListItemText sx={{ paddingLeft: 2 }} primary="登录账号" secondary={`${user.username || ''} (ID: ${user.id || ''})`} />
        </ListItem>
        <ListItem>
          <ListItemText sx={{ paddingLeft: 2 }} primary="昵称" secondary={user.nickname} />
          {myPermissions?.includes('user.edit.base') && (
            <OpenPromptDialog
              title="修改昵称"
              defaultValue={user.nickname}
              maxInputLength={30}
              onSubmit={async (inputValue) => {
                await doTaskWithUI({
                  task: async () => {
                    const modifiedUser = await userApi.modifyUser({ id: user.id, nickname: inputValue });
                    setUser(modifiedUser);
                    showSnackbar('修改成功');
                  },
                  failAlert: true,
                  fullScreenLoading: false,
                });
              }}
            >
              <IconButton color="primary">
                <EditIcon />
              </IconButton>
            </OpenPromptDialog>
          )}
        </ListItem>
        <ListItem>
          <ListItemText sx={{ paddingLeft: 2 }} primary="个性签名" secondary={user.signature || '无'} />
          {myPermissions?.includes('user.edit.base') && (
            <OpenPromptDialog
              title="修改个性签名"
              defaultValue={user.signature}
              multiline
              maxInputLength={200}
              onSubmit={async (inputValue) => {
                await doTaskWithUI({
                  task: async () => {
                    const modifiedUser = await userApi.modifyUser({ id: user.id, signature: inputValue });
                    setUser(modifiedUser);
                    showSnackbar('修改成功');
                  },
                  failAlert: true,
                  fullScreenLoading: false,
                });
              }}
            >
              <IconButton color="primary">
                <EditIcon />
              </IconButton>
            </OpenPromptDialog>
          )}
        </ListItem>
        <ListItem>
          <ListItemText
            sx={{ paddingLeft: 2 }}
            primary="用户状态"
            secondary={[ENUM_MAP_USER_STATE[user.status || UserStatus.Normal] || user.status, user.reject_reason]
              .filter(Boolean)
              .join(': ')}
          />
          {myPermissions?.includes('user.edit.status') && (
            <OpenPromptDialog
              title="修改用户状态"
              defaultValue={String(user.status)}
              options={
                UserStatusCanChangeToMap[user.status]?.map((newState) => ({
                  label: ENUM_MAP_USER_STATE[newState],
                  value: String(newState),
                })) || []
              }
              onSubmit={async (inputValue) => {
                await doTaskWithUI({
                  task: async () => {
                    const modifiedUser = await userApi.modifyUser({
                      id: user.id,
                      status: parseInt(inputValue) as UserStatus,
                    });
                    setUser(modifiedUser);
                    showSnackbar('修改成功');
                  },
                  failAlert: true,
                  fullScreenLoading: false,
                });
              }}
            >
              <IconButton color="primary">
                <EditIcon />
              </IconButton>
            </OpenPromptDialog>
          )}
        </ListItem>
        <ListItem>
          <ListItemText sx={{ paddingLeft: 2 }} primary="用户角色" secondary={user.group?.name} />
          {myPermissions?.includes('user.edit.group') && (
            <OpenPromptDialog
              title="修改用户角色"
              defaultValue={String(user.status)}
              options={(groups || []).map((group) => ({ label: group.name, value: String(group.id) }))}
              onSubmit={async (inputValue) => {
                await doTaskWithUI({
                  task: async () => {
                    const modifiedUser = await userApi.modifyUser({ id: user.id, group_id: parseInt(inputValue) });
                    setUser(modifiedUser);
                    showSnackbar('修改成功');
                  },
                  failAlert: true,
                  fullScreenLoading: false,
                });
              }}
            >
              <IconButton color="primary">
                <EditIcon />
              </IconButton>
            </OpenPromptDialog>
          )}
        </ListItem>
        <ListItem>
          <ListItemText sx={{ paddingLeft: 2 }} primary="上次登录" secondary={formatTime(user.login_at)} />
        </ListItem>
        <ListItem>
          <ListItemText sx={{ paddingLeft: 2 }} primary="注册时间" secondary={formatTime(user.created_at)} />
        </ListItem>
      </List>
      <List
        sx={{ background: theme.palette.background.paper, marginTop: 2 }}
        component="nav"
        subheader={<ListSubheader component="div">更多信息</ListSubheader>}
      >
        <ListItem>
          <ListItemButton onClick={() => history.push(`/user/threads?id=${user.id}`)}>
            <ListItemText primary="TA发布的帖子" secondary={`共 ${user.thread_count || 0} 篇`} />
            <KeyboardArrowRightIcon />
          </ListItemButton>
        </ListItem>
        <ListItem>
          <ListItemButton onClick={() => history.push(`/user/posts?id=${user.id}`)}>
            <ListItemText primary="TA回复的评论" secondary={`共 ${user.post_count || 0} 条`} />
            <KeyboardArrowRightIcon />
          </ListItemButton>
        </ListItem>
      </List>
    </AppPage>
  );
}
