import React from 'react';
import { Box, Button, Chip, CircularProgress, ListItem, ListItemText, Typography } from '@mui/material';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useRequest } from 'ahooks';
import showAlert from '@/utils/show-alert';
import { threadApi, threadTagApi } from '@/api';
import { getResourceUrl } from '@/utils/resource-url';
import OpenAlertDialog from '@/components/open-alert-dialog';
import OpenPopoverMenu from '@/components/open-popover-menu';
import MouseOverTip from '@/components/mouse-over-tip';

const ManageTagContent = (props: { threadId: string | number }) => {
  const { threadId } = props;
  const { data, refresh: refreshThreadTags } = useRequest(async () => {
    const threadTags = (await threadApi.getThread(threadId)).thread_tags;
    const threadTagIdSet = new Set(threadTags.map((t) => t.id));
    const editableTags = await threadTagApi.listEditableTagForThread(threadId);
    const addableTags = editableTags.filter((t) => !threadTagIdSet.has(t.id)); // 可操作标签 - 已设置的标签
    return {
      threadTags,
      editableTagIdSet: new Set(editableTags.map((t) => t.id)),
      addableTags,
    };
  });

  if (!data) {
    return (
      <Box sx={{ textAlign: 'center', p: 2 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {data.threadTags.length === 0 && (
        <Typography sx={{ fontSize: 13, opacity: 0.7, textAlign: 'center', p: 1 }}>帖子未添加任何标签</Typography>
      )}
      {data.threadTags.map((threadTag, index) => (
        <ListItem key={threadTag.id} divider={index < data.threadTags.length - 1} sx={{ p: 0 }}>
          <ListItemText
            secondary={
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
                  sx={{ mr: 0.5 }}
                />
                {!!threadTag.icon && (
                  <img
                    alt="icon"
                    src={getResourceUrl(threadTag.icon)}
                    style={{ height: 20, paddingRight: 4, verticalAlign: 'text-bottom' }}
                  />
                )}
                {threadTag.description}
              </>
            }
          />
          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flexShrink: 0 }}>
            {data.editableTagIdSet.has(threadTag.id) && (
              <OpenAlertDialog
                message="确定删除这个标签吗？"
                cancelText="取消"
                onOk={async () => {
                  try {
                    await threadTagApi.unbindTagForThread(threadId, threadTag.id);
                    refreshThreadTags();
                  } catch (e: any) {
                    showAlert(e.message);
                  }
                }}
              >
                <Button fullWidth size="small">
                  删除
                </Button>
              </OpenAlertDialog>
            )}
          </Box>
        </ListItem>
      ))}
      {data.addableTags.length ? (
        <Box textAlign="center" mt={2}>
          <OpenPopoverMenu
            options={[
              { groupTitle: '选择要添加的标签' },
              ...data.addableTags.map((tag) => ({
                label: (
                  <>
                    <Chip
                      size="small"
                      component="span"
                      label={
                        <>
                          {tag.name}
                          {tag.hidden_in_thread_view && (
                            <MouseOverTip tip="隐藏显示的标签不在帖子列表和详情露出">
                              <VisibilityOffIcon sx={{ ml: 0.5, verticalAlign: 'bottom' }} fontSize="small" />
                            </MouseOverTip>
                          )}
                        </>
                      }
                    />
                    {!!tag.icon && <img alt="icon" src={getResourceUrl(tag.icon)} style={{ height: 20, paddingLeft: 4 }} />}
                  </>
                ),
                summary: tag.description,
                onClick: async () => {
                  await threadTagApi.bindTagForThread(threadId, tag.id);
                  refreshThreadTags();
                },
              })),
            ]}
          >
            <Button variant="contained">添加标签</Button>
          </OpenPopoverMenu>
        </Box>
      ) : (
        <Typography sx={{ fontSize: 13, opacity: 0.7, textAlign: 'center', p: 1, mt: 1 }}>没有可再添加的标签</Typography>
      )}
    </Box>
  );
};

/** 显示帖子设置标签弹窗 */
export default function showManageTagDialog(threadId: string | number, onFinish?: () => void) {
  showAlert({
    title: '设置帖子标签',
    message: <ManageTagContent threadId={threadId} />,
    okText: null,
    closeIcon: true,
    onOpenChange: (open) => {
      if (!open) {
        onFinish?.();
      }
    },
  });
}
