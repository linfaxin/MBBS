import React, { useMemo } from 'react';
import AppPageList, { PageListProps } from '@/components/app-page-list';
import { Box, Typography } from '@mui/material';
import { postApi } from '@/api';
import AppLink from '@/components/app-link';
import { getResourceUrl } from '@/utils/resource-url';
import { formatTimeFriendly } from '@/utils/format-util';
import { usePageState } from '@/utils/use-page-history-hooks';
import { Post } from '@/api/post';
import { showConfirm } from '@/utils/show-alert';
import OpenPopoverMenu from '@/components/open-popover-menu';
import showPromptDialog from '@/utils/show-prompt-dialog';
import DoTaskButton from '@/components/do-task-button';
import ApiUI from '@/api-ui';
import { getLoginUser } from '@/api/base/user';
import showSnackbar from '@/utils/show-snackbar';
import showLoginDialog from '@/utils/show-login-dialog';

let listReloadKeyIdNext = 0;

const PostCommentList: React.FC<
  Partial<PageListProps> & {
    post: Post;
    loadAll?: boolean;
    enablePullRefreshLoad?: boolean;
  }
> = (props) => {
  const { post, listReloadKey, loadAll, enablePullRefreshLoad, ...listProps } = props;
  const postId = post.id;
  const [totalCount, setTotalCount] = usePageState<number>(`post-comment-list-${postId}.totalCount`);
  const [commentList, setCommentList] = usePageState<Post[]>(`post-comment-list-${postId}`, []);
  const listReloadKeyId = useMemo(() => listReloadKeyIdNext++, [listReloadKey]);

  const loadPage = async (pageNo: number) => {
    if (pageNo === 1) setCommentList([]);
    const pageSize = loadAll ? 100 : 3;
    const { list, totalCount } = await postApi.listComments({
      post_id: postId,
      page_offset: (pageNo - 1) * pageSize,
      page_limit: pageSize,
    });
    setCommentList(pageNo === 1 ? list : [...commentList, ...list]);
    setTotalCount(totalCount);
    return {
      hasMore: false,
      list: list,
    };
  };
  return (
    <AppPageList
      {...listProps}
      listReloadKey={`${listReloadKeyId}_${postId}_${loadAll}`}
      loadPage={loadPage}
      defaultHasMore={!commentList.length} // 初始化时已有评论（pop 时从历史回复，那么列表不再加载）
      pullRefreshLoad={enablePullRefreshLoad ? loadPage.bind(this, 1) : undefined}
      useBodyScroll={!enablePullRefreshLoad}
      renderListNoMoreFoot={<div />}
      renderPageEmpty={
        <Typography textAlign="center" p={2} sx={{ opacity: 0.6 }}>
          暂无回复
        </Typography>
      }
    >
      {commentList.map((comment, index) => (
        <Box sx={{ display: 'flex', alignItems: 'center', fontSize: 'smaller' }} key={comment.id}>
          <Box sx={{ flex: 1, wordBreak: 'break-all', pt: '6px', pb: '6px' }}>
            <AppLink href={`/user/detail?id=${comment.user_id}`}>
              <img
                alt="avatar"
                src={getResourceUrl(comment.user.avatar) || require('@/images/default-avatar.png')}
                style={{ height: 20, width: 20, verticalAlign: 'bottom' }}
              />
              <span style={{ marginLeft: 4 }}>
                {comment.user.nickname || comment.user.username}
                {!!comment.user.group?.icon && (
                  <img
                    alt="icon"
                    src={getResourceUrl(comment.user.group.icon)}
                    style={{ height: 16, verticalAlign: 'text-bottom', paddingLeft: 2 }}
                  />
                )}
              </span>
            </AppLink>
            {comment.comment_user ? (
              <>
                {' 回复 '}
                <AppLink href={`/user/detail?id=${comment.comment_user_id}`}>
                  <img
                    alt="avatar"
                    src={getResourceUrl(comment.comment_user.avatar) || require('@/images/default-avatar.png')}
                    style={{ height: 20, width: 20, verticalAlign: 'bottom' }}
                  />
                  <span style={{ marginLeft: 4 }}>
                    {comment.comment_user.nickname || comment.comment_user.username}
                    {!!comment.comment_user.group?.icon && (
                      <img
                        alt="icon"
                        src={getResourceUrl(comment.comment_user.group.icon)}
                        style={{ height: 16, verticalAlign: 'text-bottom', paddingLeft: 2 }}
                      />
                    )}
                  </span>
                </AppLink>
              </>
            ) : null}
            :{' '}
            <Typography whiteSpace="pre-wrap" component="span" fontSize="inherit">
              {ApiUI.onPreviewCommentPostText?.(comment.content, comment) || comment.content}
            </Typography>
            <span style={{ marginLeft: 12, opacity: 0.6, whiteSpace: 'nowrap', float: 'right', lineHeight: '20px' }}>
              {formatTimeFriendly(comment.created_at)}
            </span>
          </Box>
          <OpenPopoverMenu
            options={
              [
                {
                  label: '回复',
                  onClick: () => {
                    if (!getLoginUser()) {
                      showSnackbar('请先登录');
                      showLoginDialog();
                      return false;
                    }
                    showPromptDialog({
                      title: `回复"${comment.user.nickname || comment.user.username}"`,
                      multiline: true,
                      submitFailAlert: true,
                      onSubmit: async (content) => {
                        if (ApiUI.checkBeforeCreatePostComment) {
                          await ApiUI.checkBeforeCreatePostComment(post);
                        }
                        const newComment = await postApi.createComment({
                          post_id: postId,
                          content,
                          comment_post_id: comment.id,
                        });
                        setCommentList([...commentList, newComment]);
                      },
                    });
                  },
                },
                comment.can_edit && {
                  label: '编辑',
                  onClick: () =>
                    showPromptDialog({
                      title: '编辑回复',
                      defaultValue: comment.content,
                      multiline: true,
                      submitFailAlert: true,
                      onSubmit: async (content) => {
                        await postApi.modify({ post_id: comment.id, content });
                        comment.content = content;
                        setCommentList([...commentList]);
                      },
                    }),
                },
                comment.can_hide && {
                  label: '删除',
                  onClick: () =>
                    showConfirm({
                      title: '提示',
                      message: '确定删除吗？',
                      onOkErrorAlert: true,
                      onOk: async () => {
                        await postApi.deletePost(comment.id);
                        setCommentList(commentList.filter((p) => p !== comment));
                        setTotalCount(totalCount - 1);
                        showSnackbar('删除成功');
                      },
                    }),
                },
              ].filter(Boolean) as any
            }
          />
        </Box>
      ))}
      {!!commentList.length && totalCount > commentList.length && (
        <DoTaskButton
          color="inherit"
          size="small"
          failAlert
          task={async () => {
            const { list, totalCount: newTotalCount } = await postApi.listComments({
              post_id: postId,
              page_offset: 0,
              page_limit: totalCount,
            });
            setTotalCount(newTotalCount);
            setCommentList(list);
          }}
        >
          查看 {totalCount - commentList.length} 条更多回复...
        </DoTaskButton>
      )}
    </AppPageList>
  );
};

export default PostCommentList;
