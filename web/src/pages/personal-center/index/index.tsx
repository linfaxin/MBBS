import React, { useEffect, useLayoutEffect } from 'react';
import { history, useModel } from 'umi';
import { useRequest } from 'ahooks';
import EditIcon from '@mui/icons-material/Edit';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import {
  Button,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListSubheader,
  Switch,
  Typography,
  useTheme,
} from '@mui/material';
import OpenPromptDialog from '@/components/open-prompt-dialog';
import doTaskWithUI from '@/utils/do-task-with-ui';
import { userApi } from '@/api';
import OpenAlertDialog from '@/components/open-alert-dialog';
import UploadResourceButton from '@/components/upload-resource-button';
import { getResourceUrl } from '@/utils/resource-url';
import { compressImageFile } from '@/utils/compress-image-util';
import { ENUM_MAP_USER_STATE } from '@/consts';
import { formatTime } from '@/utils/format-util';
import { UserStatus } from '@/api/base/user';
import OpenChangePasswordDialog from '@/pages/personal-center/index/components/open-change-password-dialog';
import showLoginDialog from '@/utils/show-login-dialog';
import showSnackbar from '@/utils/show-snackbar';
import AppPage from '@/components/app-page';
import ApiUI from '@/api-ui';
import showAlert, { showConfirm } from '@/utils/show-alert';
import TipIconButton from '@/components/tip-icon-button';
import showBindEmailDialog from '@/utils/show-bind-email-dialog';
import showPromptDialog from '@/utils/show-prompt-dialog';

export default function UserIndexPage() {
  const { user, setUser, refreshUser } = useModel('useLoginUser');
  const bbsSetting = useModel('useBBSSetting');
  const { data: userEmail } = useRequest(() => userApi.getMyEmail());
  const theme = useTheme();

  useEffect(() => {
    if (!user) {
      showLoginDialog();
    } else if (user.token) {
      userApi.getLoginUserByToken(user.token).then((getUser) => setUser(getUser));
    }
  }, []);

  useLayoutEffect(() => {
    if (!user) return;
    if (ApiUI.onShowPersonalCenterPage) {
      ApiUI.onShowPersonalCenterPage(user);
    } else if (ApiUI.onShowUserInfoPage) {
      ApiUI.onShowUserInfoPage(user);
    }
    setTimeout(() => {
      const button = document.getElementById('button-api-ui-show-user-info-page');
      if (button) button.style.visibility = 'visible';
    }, 1000);
  }, []);

  if (!user) {
    return null;
  }

  if (ApiUI.onShowUserInfoPage || ApiUI.onShowPersonalCenterPage) {
    return (
      <AppPage title="个人信息" contentSx={{ paddingTop: 2, paddingBottom: 2, textAlign: 'center' }}>
        <Typography display="flex" alignItems="center" justifyContent="center">
          正在打开...
          <CircularProgress sx={{ ml: 1 }} size="1.6em" />
        </Typography>
        <Button
          id="button-api-ui-show-user-info-page"
          variant="outlined"
          sx={{ mt: 2, visibility: 'hidden' }}
          onClick={() => (ApiUI.onShowPersonalCenterPage || ApiUI.onShowUserInfoPage)?.(user)}
        >
          查看个人信息
        </Button>
      </AppPage>
    );
  }

  return (
    <AppPage title="个人信息" contentSx={{ paddingTop: 2, paddingBottom: 4 }}>
      <List
        component="nav"
        sx={{ width: '100%', background: theme.palette.background.paper }}
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
          <UploadResourceButton
            startIcon={<EditIcon />}
            beforeUpload={(file) => compressImageFile(file, { maxWidth: 192, maxHeight: 192, mimeType: 'image/png' })}
            onUploaded={async (result) => {
              const modifiedUser = await userApi.modifyUser({ id: user.id, avatar: result.filePath });
              setUser(modifiedUser);
              showSnackbar('修改成功');
            }}
          >
            修改头像
          </UploadResourceButton>
        </ListItem>
        <ListItem>
          <ListItemText sx={{ paddingLeft: 2 }} primary="登录账号" secondary={`${user.username} (ID: ${user.id})`} />
        </ListItem>
        <ListItem>
          <ListItemText sx={{ paddingLeft: 2 }} primary="昵称" secondary={user.nickname} />
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
        </ListItem>
        <ListItem>
          <ListItemText sx={{ paddingLeft: 2 }} primary="个性签名" secondary={user.signature || '无'} />
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
        </ListItem>
        <ListItem>
          <ListItemText
            sx={{ paddingLeft: 2 }}
            primary="用户状态"
            secondary={[ENUM_MAP_USER_STATE[user.status || UserStatus.Normal] || user.status, user.reject_reason]
              .filter(Boolean)
              .join(': ')}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            sx={{ paddingLeft: 2 }}
            primary="用户角色"
            secondary={
              <>
                {user.group?.name}
                {!!user.group?.icon && (
                  <img
                    alt="icon"
                    src={getResourceUrl(user.group.icon)}
                    style={{ height: 16, verticalAlign: 'text-bottom', paddingLeft: 4 }}
                  />
                )}
              </>
            }
          />
        </ListItem>
        {bbsSetting.site_enable_email === '1' && (
          <ListItem>
            <ListItemText
              sx={{ paddingLeft: 2 }}
              primary={
                <>
                  绑定邮箱
                  <TipIconButton message="绑定后，可以用邮箱登录论坛或者忘记密码时重置。" />
                </>
              }
              secondary={user.email ? '已绑定' + (userEmail ? `(${userEmail})` : '') : '未绑定'}
            />
            {!!user.email ? (
              <Button
                color="inherit"
                onClick={() => {
                  showConfirm({
                    title: '解绑确认',
                    message: '我们将发送解绑验证码到你的邮箱',
                    onOkErrorAlert: true,
                    okText: '继续',
                    onOk: async () => {
                      await userApi.sendRemoveBindEmailVerifyCode();
                      showPromptDialog({
                        title: '解绑邮箱',
                        inputLabel: '输入解绑验证码',
                        description: '已发送 验证码邮件 至已绑定邮箱',
                        submitFailAlert: true,
                        onSubmit: async (verifyCode) => {
                          await userApi.removeBindEmail({ verify_code: verifyCode });
                          showSnackbar('解除绑定成功');
                          refreshUser();
                        },
                      });
                    },
                  });
                }}
              >
                取消绑定
              </Button>
            ) : (
              <Button variant="contained" size="small" color="primary" onClick={() => showBindEmailDialog({ onSuc: refreshUser })}>
                马上绑定
              </Button>
            )}
          </ListItem>
        )}
        <ListItem>
          <ListItemText sx={{ paddingLeft: 2 }} primary="上次登录" secondary={formatTime(user.login_at)} />
        </ListItem>
        <ListItem>
          <ListItemText sx={{ paddingLeft: 2 }} primary="注册时间" secondary={formatTime(user.created_at)} />
        </ListItem>
      </List>
      <List
        component="nav"
        sx={{ width: '100%', background: theme.palette.background.paper, marginTop: 2 }}
        subheader={<ListSubheader component="div">功能入口</ListSubheader>}
      >
        <ListItem>
          <OpenChangePasswordDialog title="修改密码">
            <ListItemButton>
              <ListItemText primary="修改密码" />
              <KeyboardArrowRightIcon />
            </ListItemButton>
          </OpenChangePasswordDialog>
        </ListItem>
        <ListItem>
          <OpenAlertDialog
            title="提示"
            message="确定退出登录吗？"
            cancelText="取消"
            onOk={() => {
              setUser(null);
              history.push('/');
            }}
          >
            <ListItemButton>
              <ListItemText primary="退出登录" />
              <KeyboardArrowRightIcon />
            </ListItemButton>
          </OpenAlertDialog>
        </ListItem>
      </List>
    </AppPage>
  );
}
