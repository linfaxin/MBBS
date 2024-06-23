import React from 'react';
import { Box, Button, Chip, Container, ListItem, ListItemText, useTheme } from '@mui/material';
import { groupApi, threadTagApi } from '@/api';
import { useRequest } from 'ahooks';
import { getResourceUrl } from '@/utils/resource-url';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import OpenAlertDialog from '@/components/open-alert-dialog';
import showSnackbar from '@/utils/show-snackbar';
import AppPage from '@/components/app-page';
import showAlert from '@/utils/show-alert';
import OpenEditThreadTagDialog from '@/pages/manage/thread-tag/components/open-edit-thread-tag-dialog';
import { useModel } from 'umi';
import { Group } from '@/api/group';
import { GROUP_ID_TOURIST } from '@/consts';
import MouseOverTip from '@/components/mouse-over-tip';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

const ManageCategory = () => {
  const { categories } = useModel('useCategories');

  const { data: threadTags, refresh } = useRequest(() => threadTagApi.listAllTag().then((list) => [...list]));

  const { data: allGroups } = useRequest(async () => [
    { id: GROUP_ID_TOURIST, name: '游客' } as Group, // 需要显示 游客 角色
    { id: -1, name: '帖子作者' } as Group, // 帖子作者 作为一种 特殊角色
    ...(await groupApi.listGroup()),
  ]);
  const theme = useTheme();

  return (
    <AppPage title="帖子标签设置" parentPage={[{ title: '管理后台', href: '/manage' }]}>
      <Box sx={{ background: theme.palette.background.paper }}>
        {(threadTags || []).map((threadTag, index) => (
          <React.Fragment key={index}>
            <ListItem divider={index < (threadTags || []).length - 1}>
              <ListItemText
                primary={
                  <>
                    <Chip
                      size="small"
                      label={
                        <>
                          {threadTag.name}
                          {threadTag.hidden_in_thread_view && (
                            <MouseOverTip tip="隐藏显示的标签不在帖子列表和详情露出">
                              <VisibilityOffIcon sx={{ ml: 0.5, verticalAlign: 'bottom' }} fontSize="small" />
                            </MouseOverTip>
                          )}
                        </>
                      }
                      component="span"
                    />
                    {!!threadTag.icon && (
                      <img
                        alt="icon"
                        src={getResourceUrl(threadTag.icon)}
                        style={{ height: 20, paddingLeft: 4, verticalAlign: 'middle' }}
                      />
                    )}
                  </>
                }
                secondary={
                  <>
                    <div>
                      (ID: {threadTag.id}) {threadTag.description}
                    </div>
                    {threadTag.limit_use_in_categories && (
                      <div>
                        限制使用版块：
                        {threadTag.limit_use_in_categories
                          .split(',')
                          .map((cid) => categories?.find((c) => String(c.id) == cid)?.name || cid)
                          .join(', ')}
                      </div>
                    )}
                    {threadTag.limit_use_by_groups && (
                      <div>
                        限制使用角色：
                        {threadTag.limit_use_by_groups
                          .split(',')
                          .map((cid) => {
                            if (cid === '-1') return '帖子作者';
                            return allGroups?.find((c) => String(c.id) == cid)?.name || cid;
                          })
                          .join(', ')}
                      </div>
                    )}
                    {threadTag.limit_thread_read_groups && (
                      <div>
                        限制浏览帖子角色：
                        {threadTag.limit_thread_read_groups
                          .split(',')
                          .map((cid) => {
                            if (cid === '-1') return '帖子作者';
                            return allGroups?.find((c) => String(c.id) == cid)?.name || cid;
                          })
                          .join(', ')}
                      </div>
                    )}
                    {threadTag.limit_thread_write_groups && (
                      <div>
                        限制修改帖子角色：
                        {threadTag.limit_thread_write_groups
                          .split(',')
                          .map((cid) => {
                            if (cid === '-1') return '帖子作者';
                            return allGroups?.find((c) => String(c.id) == cid)?.name || cid;
                          })
                          .join(', ')}
                      </div>
                    )}
                  </>
                }
                secondaryTypographyProps={{
                  component: 'div',
                  sx: { mt: 1 },
                }}
              />
              <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flexShrink: 0 }}>
                <OpenEditThreadTagDialog
                  title="修改标签"
                  threadTag={threadTag}
                  doSubmit={async (fields) => {
                    await threadTagApi.setTag(threadTag.id, fields);
                    refresh();
                    showSnackbar('修改成功');
                  }}
                >
                  <Button startIcon={<EditIcon />} variant="contained" fullWidth size="small">
                    修改
                  </Button>
                </OpenEditThreadTagDialog>
                {threadTag.id >= 100 && (
                  // 系统预置标签(ID<100) 不允许删除
                  <OpenAlertDialog
                    message="确定删除这个标签吗？"
                    cancelText="取消"
                    onOk={async () => {
                      try {
                        await threadTagApi.removeTag(threadTag.id);
                        refresh();
                      } catch (e: any) {
                        showAlert(e.message);
                      }
                    }}
                  >
                    <Button fullWidth size="small" sx={{ marginTop: 1 }}>
                      删除
                    </Button>
                  </OpenAlertDialog>
                )}
              </Box>
            </ListItem>
          </React.Fragment>
        ))}
      </Box>
      <Container sx={{ paddingTop: 2, paddingBottom: 2 }} maxWidth="xs">
        <OpenEditThreadTagDialog
          title="新增标签"
          doSubmit={async (fields) => {
            await threadTagApi.addTag(fields);
            refresh();
            showSnackbar('新增成功');
          }}
        >
          <Button startIcon={<AddIcon />} variant="contained" fullWidth>
            新增标签
          </Button>
        </OpenEditThreadTagDialog>
      </Container>
    </AppPage>
  );
};

export default ManageCategory;
