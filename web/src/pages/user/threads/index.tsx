import AppPage from '@/components/app-page';
import ThreadList from '@/components/thread-list';
import { history, useModel } from 'umi';
import { useRequest } from 'ahooks';
import { userApi } from '@/api';

export default function UserPostsPage() {
  const { user: loginUser } = useModel('useLoginUser');
  const { id } = history.location.query || {};
  const { data: user } = useRequest(async () => (id ? userApi.getUserById(String(id)) : null));

  return (
    <AppPage title={parseInt(String(id)) === loginUser?.id ? '我的帖子' : `${user?.nickname ? `${user.nickname}的` : ''}帖子`}>
      <ThreadList queryParam={{ user_id: String(id) }} showCategoryName />
    </AppPage>
  );
}
