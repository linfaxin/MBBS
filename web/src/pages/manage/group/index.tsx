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
import showAlert, { showConfirm } from '@/utils/show-alert';
import { formatTime } from '@/utils/format-util';
import AppLink from '@/components/app-link';
import { GROUP_ID_TOURIST, GROUP_ID_ADMIN } from '@/consts';
import { getResourceUrl } from '@/utils/resource-url';
import OpenEditGroupDialog from './components/open-edit-group-dialog';

const ManageCategory = () => {
  const { data: groups, refresh } = useRequest(() => groupApi.listGroup(true));
  const theme = useTheme();
  const groupAdmin = groups?.find((p) => p.id === GROUP_ID_ADMIN);

  return (
    <AppPage title="角色管理" parentPage={[{ title: '管理后台', href: '/manage' }]}>
      <Typography variant="h5" p={2}>
        角色列表
      </Typography>
      <List sx={{ background: theme.palette.background.paper }} disablePadding>
        {groupAdmin && (
          <ListItem divider>
            <ListItemText
              primary={
                <>
                  {groupAdmin.name}
                  {!!groupAdmin.icon && (
                    <img alt="icon" src={getResourceUrl(groupAdmin.icon)} style={{ width: 20, height: 20, paddingLeft: 4 }} />
                  )}
                  <OpenEditGroupDialog
                    title="修改角色"
                    group={groupAdmin}
                    doSubmitGroup={async (fields) => {
                      try {
                        await groupApi.setGroup(groupAdmin.id, fields);
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
                  </OpenEditGroupDialog>
                </>
              }
              primaryTypographyProps={{
                display: 'flex',
                alignItems: 'center',
              }}
              secondary="admin"
            />
          </ListItem>
        )}
        <ListItem divider>
          <ListItemText
            primary="游客"
            secondary={
              <>
                <Typography>ID：{GROUP_ID_TOURIST}</Typography>
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
        {(groups || [])
          .filter((p) => p.id !== GROUP_ID_ADMIN)
          .map((group, index, arr) => (
            <ListItem key={index} divider={index < arr.length - 1}>
              <ListItemText
                primary={
                  <>
                    {group.name}
                    {!!group.icon && <img alt="icon" src={getResourceUrl(group.icon)} style={{ width: 20, height: 20, paddingLeft: 4 }} />}
                    <OpenEditGroupDialog
                      title="修改角色"
                      group={group}
                      doSubmitGroup={async (fields) => {
                        try {
                          await groupApi.setGroup(group.id, fields);
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
                    </OpenEditGroupDialog>
                  </>
                }
                primaryTypographyProps={{
                  display: 'flex',
                  alignItems: 'center',
                }}
                secondary={
                  <>
                    <Typography>ID：{group.id}</Typography>
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
                  <Button
                    sx={{ mt: 1 }}
                    onClick={() => {
                      showConfirm({
                        title: '修改默认角色',
                        message: `确认将 "${group.name}" 设置为 新注册用户的默认角色吗？`,
                        onOkErrorAlert: true,
                        onOk: () => groupApi.setGroupIsDefault(group.id).then(refresh),
                      });
                    }}
                  >
                    设为默认
                  </Button>
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
                  <Button size="small">删除</Button>
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
