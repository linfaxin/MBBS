import React, { useState } from 'react';
import { useModel } from 'umi';
import { Badge, Box, Button, Divider, List, ListItem, ListItemText, Typography, useTheme } from '@mui/material';
import { messageApi } from '@/api';
import { formatTime } from '@/utils/format-util';
import showSnackbar from '@/utils/show-snackbar';
import AppPage from '@/components/app-page';
import showAlert, { showConfirm } from '@/utils/show-alert';
import { Message } from '@/api/message';
import { getPageStateWhenPop, setPageState, usePageState } from '@/utils/use-page-history-hooks';
import AppPageList from '@/components/app-page-list';
import OpenPopoverMenu from '@/components/open-popover-menu';
import { setMessageSyncToEmailEnable } from '@/utils/show-bind-email-dialog';

export default function UserMessageCenterPage() {
  const { user, refreshUser } = useModel('useLoginUser');
  const { unreadCount, reloadUnReadCount } = useModel('useMessageCenter');
  const [totalCount, setTotalCount] = usePageState<number>('user-message-center.totalCount');
  const [messages, setMessages] = usePageState<Message[]>('user-message-center');
  const [listReloadKeyId, setListReloadKeyId] = useState(0);
  const theme = useTheme();

  const loadPage = async (pageNo: number) => {
    if (pageNo === 1) {
      setMessages([]);
      reloadUnReadCount();
    }
    const pageSize = 20;
    const { list, totalCount, unreadCount } = await messageApi.listMessage({
      page_offset: (pageNo - 1) * pageSize,
      page_limit: pageSize,
    });
    setMessages(pageNo === 1 ? list : [...messages, ...list]);
    setTotalCount(totalCount);
    if (list?.length > 0) {
      setPageState('user-message.next-page-no', pageNo + 1);
    }
    return {
      hasMore: list.length >= pageSize,
      list: list,
    };
  };

  const viewMessageDetail = async (messageItem: Message) => {
    if (!messageItem.read_at) {
      const loadMessage = await messageApi.readMessage(messageItem.id);
      Object.assign(messageItem, loadMessage);
      setMessages([...messages]);
      reloadUnReadCount();
    }

    showAlert({
      title: messageItem.title,
      message: messageItem.content,
      cancelText: '关闭',
      okText: messageItem.link ? '查看详情' : null,
      onOk: () => {
        window.open(messageItem.link);
      },
    });
  };

  const onClickDeleteMsg = async (messageItem: Message) => {
    const isViewUnread = !messageItem.read_at;
    showConfirm({
      title: '删除这条消息吗？',
      message: `"${messageItem.title}"`,
      onOkErrorAlert: true,
      onOk: async () => {
        await messageApi.removeMessage(messageItem.id);
        messages.splice(messages.indexOf(messageItem), 1);
        setMessages([...messages]);
        if (isViewUnread) {
          reloadUnReadCount();
        }
      },
    });
  };

  return (
    <AppPage title="消息中心" contentSx={{ paddingBottom: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', paddingLeft: 2, minHeight: 40, bgcolor: theme.palette.background.paper }}>
        <Typography fontSize="smaller">
          消息数：{totalCount}（未读：{unreadCount}）
        </Typography>
        <div style={{ flex: 1 }} />
        <OpenPopoverMenu
          options={[
            {
              label: '全部标记已读',
              onClick: async () => {
                await messageApi.readAllMessage();
                showSnackbar('全部已读成功');
                setListReloadKeyId((id) => id + 1);
              },
            },
            {
              label: '全部删除',
              onClick: () => {
                showConfirm({
                  title: '全部删除确认',
                  message: `确认全部删除已读和未读的消息吗？`,
                  onOkErrorAlert: true,
                  onOk: async () => {
                    await messageApi.removeAllMessage();
                    showSnackbar('全部删除成功');
                    setListReloadKeyId((id) => id + 1);
                  },
                });
              },
            },
            {
              label: (
                <div>
                  <div>消息同步至邮箱</div>
                  <div style={{ fontSize: 13, opacity: 0.6 }}>当前：已{user?.email && user.msg_to_email_enable ? '开启' : '关闭'}</div>
                </div>
              ),
              onClick: () => {
                if (!user) return;
                const aimEnable = !(user?.email && user.msg_to_email_enable);
                setMessageSyncToEmailEnable(user, aimEnable, () => {
                  refreshUser();
                  showSnackbar(`设置成功：已${aimEnable ? '开启' : '关闭'}`);
                });
              },
            },
          ]}
        />
      </Box>
      <Divider orientation="horizontal" />
      <AppPageList
        listReloadKey={`${listReloadKeyId}`}
        loadPage={loadPage}
        defaultPageNo={getPageStateWhenPop('user-message.next-page-no') || 1}
        useBodyScroll
        renderListNoMoreFoot={
          <Typography textAlign="center" p={2} fontSize="smaller" sx={{ opacity: 0.5 }}>
            回复加载完毕
          </Typography>
        }
        renderPageEmpty={
          <Typography textAlign="center" p={2} sx={{ opacity: 0.6 }}>
            <span style={{ opacity: 0.6 }}>暂无消息</span>
          </Typography>
        }
      >
        <List sx={{ background: theme.palette.background.paper }} disablePadding>
          {!!messages?.length &&
            messages.map((msgItem, index) => (
              <ListItem key={msgItem.id} divider={index < messages.length - 1}>
                {!msgItem.read_at && <Badge color="error" variant="dot" sx={{ mr: 2 }} />}
                <ListItemText
                  primary={
                    <Badge
                      anchorOrigin={{
                        vertical: 'top',
                        horizontal: 'left',
                      }}
                      invisible={!!msgItem.read_at}
                    >
                      {msgItem.title}
                    </Badge>
                  }
                  secondary={formatTime(msgItem.updated_at || msgItem.created_at)}
                />
                <Box display="flex" alignItems="center" flexDirection="column">
                  <Button variant="contained" onClick={() => viewMessageDetail(msgItem)}>
                    查看
                  </Button>
                  <Button onClick={() => onClickDeleteMsg(msgItem)}>删除</Button>
                </Box>
              </ListItem>
            ))}
        </List>
      </AppPageList>
    </AppPage>
  );
}
