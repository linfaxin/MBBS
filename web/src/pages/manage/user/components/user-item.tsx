import React from 'react';
import { Box, Button, Grid, Typography } from '@mui/material';
import { User } from '@/api/base/user';
import { getResourceUrl } from '@/utils/resource-url';
import { ENUM_MAP_USER_STATE } from '@/consts';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import OpenEditUserDialog from '@/pages/manage/user/components/open-edit-user-dialog';
import AppLink from '@/components/app-link';
import OpenPromptDialog from '@/components/open-prompt-dialog';
import { manageApi } from '@/api';
import showSnackbar from '@/utils/show-snackbar';

const UserItem: React.FC<{
  user: User;
  onUserEdit: (newUser: User) => void | Promise<void>;
}> = (props) => {
  const { user, onUserEdit } = props;
  return (
    <Box sx={{ padding: 2, display: 'flex' }}>
      <img alt="avatar" src={getResourceUrl(user.avatar) || require('@/images/default-avatar.png')} style={{ width: 60, height: 60 }} />
      <Grid container spacing={{ xs: 0, sm: 2 }} columns={12} sx={{ paddingLeft: 2, flex: 1 }}>
        <Grid item xs={12} sm={6}>
          <Typography>ID：{user.id}</Typography>
          <Typography>账号：{user.username}</Typography>
          <Typography>昵称：{user.nickname}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography>角色：{user.group?.name}</Typography>
          <Typography>状态：{ENUM_MAP_USER_STATE[user.status] || user.status}</Typography>
        </Grid>
      </Grid>
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <AppLink href={`/user/detail?id=${user.id}`}>
          <Button startIcon={<VisibilityIcon />} fullWidth size="small">
            详情
          </Button>
        </AppLink>
        <OpenEditUserDialog user={user} onUserEdit={onUserEdit}>
          <Button startIcon={<EditIcon />} fullWidth size="small">
            修改
          </Button>
        </OpenEditUserDialog>
        {user.username !== 'admin' && (
          <OpenPromptDialog
            title="重置用户密码"
            inputLabel="新密码"
            submitFailAlert
            onSubmit={async (new_password) => {
              if (!new_password) throw new Error('请输入新密码');
              await manageApi.resetUserPassword({ user_id: user.id, new_password });
              showSnackbar('重置成功');
            }}
          >
            <Button size="small" fullWidth>
              重置密码
            </Button>
          </OpenPromptDialog>
        )}
      </Box>
    </Box>
  );
};

export default UserItem;
