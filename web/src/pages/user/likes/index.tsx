import AppPage from '@/components/app-page';
import { history, useModel } from 'umi';
import { useRequest } from 'ahooks';
import { userApi } from '@/api';
import PostList from '@/components/post-list';
import AppLink from '@/components/app-link';
import { Button, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { usePageState } from '@/utils/use-page-history-hooks';
import UserPostCommentList from '@/components/user-comment-list';

export default function UserLikesPage() {
  const { user: loginUser } = useModel('useLoginUser');
  const { id } = history.location.query || {};
  const { data: user } = useRequest(async () => (id ? userApi.getUserById(String(id)) : null));
  const [type, setType] = usePageState('user-likes-type', 'thread');

  return (
    <AppPage title={parseInt(String(id)) === loginUser?.id ? '我的点赞' : `${user?.nickname ? `${user.nickname}的` : ''}点赞`}>
      <ToggleButtonGroup
        color="primary"
        value={type}
        exclusive
        sx={{ mt: 1, mb: 1, width: '100%', justifyContent: 'center' }}
        onChange={(e, v) => setType(v)}
      >
        <ToggleButton size="small" value="thread">
          点赞的帖子
        </ToggleButton>
        <ToggleButton size="small" value="post">
          点赞的评论
        </ToggleButton>
      </ToggleButtonGroup>
      {type === 'post' && (
        <PostList
          queryParam={{ like_by_user_id: String(id) }}
          renderExtraActions={(post) => (
            <AppLink href={`/thread/detail/${post.thread_id}`}>
              <Button color="inherit">查看帖子</Button>
            </AppLink>
          )}
        />
      )}
    </AppPage>
  );
}
