import React from 'react';
import { Box, Button, Container, IconButton, List, ListItem, ListItemText, Typography, useTheme } from '@mui/material';
import { groupApi } from '@/api';
import { useRequest } from 'ahooks';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import SettingsIcon from '@mui/icons-material/Settings';
import OpenAlertDialog from '@/components/open-alert-dialog';
import showSnackbar from '@/utils/show-snackbar';
import AppPage from '@/components/app-page';
import OpenPromptDialog from '@/components/open-prompt-dialog';
import showAlert from '@/utils/show-alert';
import { formatTime } from '@/utils/format-util';
import AppLink from '@/components/app-link';
import { GROUP_ID_TOURIST } from '@/consts';
import DoTaskButton from '@/components/do-task-button';

const ManageCategory = () => {
  const { data: groups, refresh } = useRequest(() => groupApi.listGroup(true));
  const theme = useTheme();

  return (
    <AppPage title="角色管理" parentPage={[{ title: '管理后台', href: '/manage' }]}>
      <Typography variant="h5" p={2}>
        角色列表
      </Typography>
      <List sx={{ background: theme.palette.background.paper }}>
        <ListItem divider>
          <ListItemText
            primary="游客"
            secondary={
              <>
                <Typography>ID：{GROUP_ID_TOURIST}</Typography>
                <Typography>角色名：游客</Typography>
                <Typography>是否默认：否</Typography>
              </>
            }
            secondaryTypographyProps={{ component: 'div' }}
          />
          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <AppLink href={`/manage/permission?groupId=${GROUP_ID_TOURIST}&groupName=${encodeURIComponent('游客')}`}>
              <Button startIcon={<SettingsIcon />} size="small" variant="contained">
                权限
              </Button>
            </AppLink>
          </Box>
        </ListItem>
        {(groups || []).map((group, index) => (
          <ListItem key={index} divider={index < (groups || []).length - 1}>
            <ListItemText
              primary={
                <>
                  {group.name}
                  <OpenPromptDialog
                    title="修改角色名"
                    defaultValue={group.name}
                    onSubmit={async (inputValue) => {
                      try {
                        await groupApi.setGroupName(group.id, inputValue);
                        refresh();
                        showSnackbar('修改成功');
                      } catch (e: any) {
                        showAlert(e.message);
                      }
                    }}
                  >
                    <IconButton color="primary" size="small" sx={{ marginLeft: 1 }}>
                      <EditIcon />
                    </IconButton>
                  </OpenPromptDialog>
                </>
              }
              primaryTypographyProps={{
                display: 'flex',
                alignItems: 'center',
              }}
              secondary={
                <>
                  <Typography>ID：{group.id}</Typography>
                  <Typography>角色名：{group.name}</Typography>
                  <Typography>是否新用户默认角色：{group.default ? '是' : '否'}</Typography>
                  <Typography>创建时间：{formatTime(group.created_at)}</Typography>
                </>
              }
              secondaryTypographyProps={{ component: 'div' }}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <AppLink href={`/manage/permission?groupId=${group.id}&groupName=${encodeURIComponent(group.name)}`}>
                <Button startIcon={<SettingsIcon />} size="small" variant="contained">
                  权限
                </Button>
              </AppLink>
              {!group.default && (
                <DoTaskButton task={() => groupApi.setGroupIsDefault(group.id).then(refresh)} sx={{ marginTop: 1 }}>
                  设为默认
                </DoTaskButton>
              )}
              <OpenAlertDialog
                message="确定删除这个角色吗？"
                cancelText="取消"
                onOk={async () => {
                  try {
                    await groupApi.removeGroup(group.id);
                    refresh();
                  } catch (e: any) {
                    showAlert(e.message);
                  }
                }}
              >
                <Button size="small" sx={{ marginTop: 1 }}>
                  删除
                </Button>
              </OpenAlertDialog>
            </Box>
          </ListItem>
        ))}
      </List>
      <Container sx={{ paddingTop: 2, paddingBottom: 2 }} maxWidth="xs">
        <OpenPromptDialog
          title="新增角色"
          onSubmit={async (inputValue) => {
            try {
              await groupApi.addGroup(inputValue);
              refresh();
              showSnackbar('新增成功');
            } catch (e: any) {
              showAlert(e.message);
            }
          }}
        >
          <Button startIcon={<AddIcon />} variant="contained" fullWidth>
            新增角色
          </Button>
        </OpenPromptDialog>
      </Container>
    </AppPage>
  );
};

export default ManageCategory;
