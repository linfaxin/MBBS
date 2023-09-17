import { useEffect } from 'react';
import { useRequest } from 'ahooks';
import { getLoginUser, onLoginUserChange } from '@/api/base/user';
import { messageApi } from '@/api';

export default function useMessageCenter() {
  const { data: unreadCount, refresh } = useRequest(async () => {
    if (!getLoginUser()) return 0;
    return await messageApi.getUnreadMessageCount();
  });

  useEffect(() => {
    setInterval(refresh, 5 * 60 * 1000); // 5min 轮询一次
    onLoginUserChange((user) => refresh()); // 监听 user 变更
  }, []);

  return {
    unreadCount,
    reloadUnReadCount() {
      refresh();
    },
  };
}
