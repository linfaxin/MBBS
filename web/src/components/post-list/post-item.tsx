import React, { useState } from 'react';
import MarkdownPreview from '@/components/vditor/markdown-preview';
import { Box, Button, Typography, useTheme } from '@mui/material';
import AppLink from '@/components/app-link';
import { getResourceUrl } from '@/utils/resource-url';
import { formatTimeFriendly } from '@/utils/format-util';
import OpenAlertDialog from '@/components/open-alert-dialog';
import { postApi } from '@/api';
import OpenPromptDialog from '@/components/open-prompt-dialog';
import DoTaskButton from '@/components/do-task-button';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';
import { Post } from '@/api/post';
import PostCommentList from '@/components/post-comment-list';
import showSnackbar from '@/utils/show-snackbar';
import ApiUI from '@/api-ui';
import OpenPopupMarkdownEditWithUrlQuery from '@/components/open-popup-markdown-edit-with-url-query';
import showLoginDialog from '@/utils/show-login-dialog';
import { getLoginUser } from '@/api/base/user';

const PostItem: React.FC<{
  post: Post;
  postList: Array<Post>;
  setPostList: (newPostList: Array<Post>) => void;
  renderExtraActions?: (post: Post, reRender: () => void) => React.ReactNode;
}> = (props) => {
  const theme = useTheme();
  const { post, postList, setPostList, renderExtraActions } = props;
  const [commentListReloadKey, setCommentListReloadKey] = useState(1);
  const [hasCommented, setHasCommented] = useState(false);
  const reRender = () => setPostList([...postList]);
  return (
    <Box sx={{ padding: 2 }}>
      <MarkdownPreview
        markdown={ApiUI.onPreviewPostContentMarkdown?.(post.content, post) || post.content}
        transformHtml={ApiUI.onPreviewPostContentHtml ? (html) => ApiUI.onPreviewPostContentHtml?.(html, post) : undefined}
      />
      <Box sx={{ display: 'flex', alignItems: 'center', marginTop: 1, fontSize: 'smaller' }}>
        <AppLink sx={{ display: 'flex', alignItems: 'center' }} href={`/user/detail?id=${post.user_id}`}>
          <img
            alt="avatar"
            src={getResourceUrl(post.user.avatar) || require('@/images/default-avatar.png')}
            style={{ height: 20, width: 20 }}
          />
          <span style={{ marginLeft: 4 }}>{post.user.nickname || post.user.username}</span>
        </AppLink>
        <span style={{ marginLeft: 12, opacity: 0.6 }}>{formatTimeFriendly(post.created_at)}</span>
        {post.is_sticky ? (
          <Typography ml={1} fontSize="smaller">
            置顶
          </Typography>
        ) : null}
      </Box>
      {!!post.reply_count && (
        <Box
          sx={{
            mt: 1,
            pl: 2,
            background: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          }}
        >
          <PostCommentList post={post} listReloadKey={commentListReloadKey} loadAll={hasCommented} />
        </Box>
      )}
      <Box
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', color: 'grey.500', marginBottom: -2, flexWrap: 'wrap' }}
      >
        {renderExtraActions && renderExtraActions(post, reRender)}
        {ApiUI.threadPostExtraButtons &&
          ApiUI.threadPostExtraButtons.map((btn, i) => (
            <Button key={i} color="inherit" onClick={() => btn.onClick(post)}>
              {btn.text}
            </Button>
          ))}
        {post.can_hide && (
          <OpenAlertDialog
            title="提示"
            message="确定删除吗?"
            cancelText="取消"
            onOkErrorAlert
            onOk={async () => {
              await postApi.deletePost(post.id);
              setPostList(postList.filter((p) => p !== post));
              showSnackbar('删除成功');
            }}
          >
            <Button color="inherit">删除</Button>
          </OpenAlertDialog>
        )}
        {post.can_edit && (
          <OpenPopupMarkdownEditWithUrlQuery
            title="编辑评论"
            defaultValue={post.content}
            placeholder="请输入评论内容"
            onSubmitFailAlert
            onSubmit={async (inputValue) => {
              const newPost = await postApi.modify({ post_id: post.id, content: inputValue });
              setPostList(postList.map((p) => (p === post ? newPost : p)));
            }}
          >
            <Button color="inherit">编辑</Button>
          </OpenPopupMarkdownEditWithUrlQuery>
        )}
        <OpenPromptDialog
          title={`回复"${post.user.nickname || post.user.username}"的评论`}
          multiline
          submitFailAlert
          onSubmit={async (inputValue) => {
            if (ApiUI.checkBeforeCreatePostComment) {
              await ApiUI.checkBeforeCreatePostComment(post);
            }
            await postApi.createComment({ post_id: post.id, content: inputValue });
            showSnackbar('回复成功');
            setCommentListReloadKey(commentListReloadKey + 1);
            post.reply_count++;
            setHasCommented(true);
          }}
          handleOpenChange={(open) => {
            if (!getLoginUser()) {
              showSnackbar('请先登录');
              showLoginDialog();
              return false;
            }
            return open;
          }}
        >
          <Button color="inherit">回复</Button>
        </OpenPromptDialog>
        {post.can_like && (
          <DoTaskButton
            startIcon={post.is_liked ? <ThumbUpIcon /> : <ThumbUpOutlinedIcon />}
            loadingPosition="start"
            color="inherit"
            failAlert
            task={async () => {
              await postApi.setLike({ post_id: post.id, is_like: !post.is_liked });
              post.is_liked = !post.is_liked;
              post.like_count = post.is_liked ? post.like_count + 1 : post.like_count - 1;
              setPostList([...postList]);
            }}
          >
            {post.like_count}
          </DoTaskButton>
        )}
      </Box>
    </Box>
  );
};

export default PostItem;
