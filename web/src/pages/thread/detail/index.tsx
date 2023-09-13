import React, { useLayoutEffect, useMemo, useState } from 'react';
import { postApi, threadApi } from '@/api';
import { history, useModel, useParams, useLocation } from 'umi';
import copyToClipboard from 'copy-to-clipboard';
import { Box, Button, ButtonGroup, Typography, useTheme } from '@mui/material';
import { getResourceUrl } from '@/utils/resource-url';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import MoreTimeIcon from '@mui/icons-material/MoreTime';
import AddCommentIcon from '@mui/icons-material/AddComment';
import AppPage from '@/components/app-page';
import { removeThreadInHistoryData, updateThreadInHistoryData, usePageState } from '@/utils/use-page-history-hooks';
import { Thread } from '@/api/thread';
import { formatTime, formatTimeFriendly } from '@/utils/format-util';
import AppLink from '@/components/app-link';
import OpenPopoverMenu from '@/components/open-popover-menu';
import showAlert from '@/utils/show-alert';
import showSnackbar from '@/utils/show-snackbar';
import MouseOverTip from '@/components/mouse-over-tip';
import PostList from '@/components/post-list';
import doTaskWithUI from '@/utils/do-task-with-ui';
import OpenPopupMarkdownEditor from '@/components/open-popup-markdown-editor';
import ApiUI from '@/api-ui';
import { markThreadViewed } from '@/utils/view-thread-records-util';
import showPromptDialog from '@/utils/show-prompt-dialog';
import ThreadContentPreview from '@/components/thread-content/thread-content-preview';
import DoTaskButton from '@/components/do-task-button';

export default function ThreadDetailPage() {
  const params = useParams() as any;
  const threadId = params.id;
  return <ThreadDetailPageComponent key={threadId} threadId={threadId} />;
}

function ThreadDetailPageComponent(props: { threadId: number | string }) {
  const { threadId } = props;
  const { categories, reloadCategory } = useModel('useCategories');
  const [thread, setThread] = usePageState<Thread>('thread-detail');
  const [postListReloadKey, setPostListReloadKey] = useState(1);
  const theme = useTheme();
  const umiLocation = useLocation();
  const openReplyDialog = !!umiLocation.search.match(/openReply=1/);
  useLayoutEffect(() => {
    if (openReplyDialog) {
      // 忽略：页面初始化时 就要打开评论弹窗
      history.replace('?');
    }
  }, []);

  const loadThread = async () => {
    const thread =
      history.location.query?.isAdmin === '1' ? await threadApi.getThreadForAdmin(threadId) : await threadApi.getThread(threadId);
    markThreadViewed(threadId);
    setThread(thread);
    updateThreadInHistoryData(thread);
  };

  const threadContentMarkdown = useMemo(() => {
    if (!thread) return null;
    if (ApiUI.onPreviewThreadContentMarkdown) {
      return ApiUI.onPreviewThreadContentMarkdown(thread.content, thread);
    }
    return thread.content;
  }, [thread]);

  const onClickShare = () => {
    if (ApiUI.onShare) {
      ApiUI.onShare(location.href);
      return;
    }
    showAlert({
      title: '分享页面链接',
      message: location.href,
      cancelText: '复制链接',
      onCancel: () => {
        if (copyToClipboard(location.href, { message: '请手动复制链接' })) {
          showSnackbar('已复制链接');
        }
      },
    });
  };

  const onClickToggleLike = () => {
    doTaskWithUI({
      task: async () => {
        await threadApi.setLike(threadId, !thread.is_liked);
        showSnackbar(thread.is_liked ? '取消点赞成功' : '点赞成功');
        loadThread();
      },
    });
  };

  const onClickDelete = () => {
    showAlert({
      title: '提示',
      message: '确定删除帖子吗？',
      cancelText: '取消',
      okText: '删除',
      onOkErrorAlert: true,
      onOk: async () => {
        await threadApi.deleteThread(threadId);
        showSnackbar('删除成功');
        removeThreadInHistoryData(thread);
        history.goBack();
        reloadCategory();
      },
    });
  };

  const onClickToggleStick = () => {
    showAlert({
      title: '提示',
      message: thread.is_sticky ? '确定取消置顶吗？' : '确定置顶吗？',
      cancelText: '取消',
      onOkErrorAlert: true,
      onOk: async () => {
        await threadApi.setSticky(threadId, !thread.is_sticky);
        showSnackbar('设置成功');
        loadThread();
      },
    });
  };

  const onClickToggleEssence = () => {
    showAlert({
      title: '提示',
      message: thread.is_essence ? '确定取消精华吗？' : '确定设置为精华吗？',
      cancelText: '取消',
      onOkErrorAlert: true,
      onOk: async () => {
        await threadApi.setEssence(threadId, !thread.is_essence);
        showSnackbar('设置成功');
        loadThread();
      },
    });
  };

  const onClickSetDisablePost = () => {
    showPromptDialog({
      title: '设置评论开关',
      inputLabel: '帖子评论开关',
      defaultValue: thread.disable_post ? 'off' : thread.disable_post === false ? 'on' : 'default',
      description: `当前板块评论开关：${categories?.find((c) => c.id === thread.category_id)?.disable_post ? '关' : '开'}`,
      options: [
        { label: '跟随板块', value: 'default' },
        { label: '开', value: 'on' },
        { label: '关', value: 'off' },
      ],
      onSubmit: async (input) => {
        const disablePost = input === 'on' ? false : input === 'off' ? true : null;
        await threadApi.setDisablePost(threadId, disablePost);
        showSnackbar('设置成功');
        setPostListReloadKey(postListReloadKey + 1); // 重新加载评论列表
        loadThread();
      },
      submitFailAlert: true,
    });
  };

  const threadMenus: Array<{ label: string; onClick: () => void }> = useMemo(() => {
    if (!thread) return [];
    let menus = [
      { label: '分享', onClick: onClickShare },
      thread?.can_edit && {
        label: '编辑帖子',
        onClick: () => history.push(`/thread/edit/${threadId}${history.location.search || ''}`),
      },
      thread?.can_hide && { label: '删除帖子', onClick: onClickDelete },
      thread?.can_sticky && { label: thread.is_sticky ? '取消置顶' : '置顶', onClick: onClickToggleStick },
      thread?.can_essence && { label: thread.is_essence ? '取消精华' : '精华', onClick: onClickToggleEssence },
      thread?.can_set_disable_post && { label: '设置评论开关', onClick: onClickSetDisablePost },
    ].filter(Boolean) as Array<{ label: string; onClick: () => void }>;
    if (ApiUI.showThreadDetailMenu) {
      menus = ApiUI.showThreadDetailMenu(thread, menus);
    }
    return menus;
  }, [thread]);

  return (
    <AppPage
      title="帖子详情"
      parentPageCategoryId={thread?.category_id}
      initPage={loadThread}
      showInitPageLoading={!thread}
      requestNavBackButton
    >
      <Box sx={{ background: theme.palette.background.paper, padding: 2 }}>
        <Box sx={{ display: 'flex', alignContent: 'center', alignItems: 'flex-start' }}>
          <Typography variant="h6" flex={1} sx={{ wordBreak: 'break-all' }}>
            {thread?.title}
          </Typography>
          <OpenPopoverMenu options={threadMenus} />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', marginTop: 1, marginBottom: 2, fontSize: 'smaller' }}>
          <AppLink
            href={`/user/detail?id=${thread?.user?.id}`}
            sx={{ display: 'flex', alignItems: 'center', flexShrink: 1, overflow: 'hidden', whiteSpace: 'nowrap' }}
          >
            <img
              alt="avatar"
              src={getResourceUrl(thread?.user?.avatar) || require('@/images/default-avatar.png')}
              style={{ height: 20, width: 20 }}
            />
            <span
              style={{
                marginLeft: 4,
                textOverflow: 'ellipsis',
                overflow: 'hidden',
              }}
            >
              {thread?.user?.nickname || thread?.user?.username}
            </span>
          </AppLink>
          <Box sx={{ display: 'flex', alignItems: 'center', flex: 'none' }}>
            <MoreTimeIcon fontSize="small" opacity={0.5} sx={{ marginLeft: 1.2 }} />
            <MouseOverTip tip={`创建时间：${formatTime(thread?.created_at)}\n修改时间：${formatTime(thread?.modified_at)}`}>
              <span style={{ marginLeft: '2px', opacity: 0.6 }}>{formatTimeFriendly(thread?.created_at)}</span>
            </MouseOverTip>
            <VisibilityIcon fontSize="small" opacity={0.5} sx={{ marginLeft: 1.2 }} />
            <MouseOverTip tip="阅读量">
              <span style={{ marginLeft: '2px', opacity: 0.6 }}>{thread?.view_count}</span>
            </MouseOverTip>
            {thread?.is_sticky ? (
              <Typography ml={1} fontSize="smaller">
                置顶
              </Typography>
            ) : null}
            {thread?.is_essence ? (
              <Typography ml={1} fontSize="smaller">
                精华
              </Typography>
            ) : null}
          </Box>
        </Box>
        {!!threadContentMarkdown && (
          <ThreadContentPreview
            markdown={threadContentMarkdown}
            transformHtml={ApiUI.onPreviewThreadContentHtml ? (html) => ApiUI.onPreviewThreadContentHtml?.(html, thread) : undefined}
          />
        )}
      </Box>
      {thread?.can_view_posts ? (
        <PostList
          queryParam={{ thread_id: threadId }}
          listReloadKey={postListReloadKey}
          style={{ marginTop: 20 }}
          renderExtraActions={(post) =>
            post.can_sticky ? (
              <DoTaskButton
                task={async () => {
                  await postApi.setSticky({ post_id: post.id, is_sticky: !post.is_sticky });
                  setPostListReloadKey(postListReloadKey + 1);
                }}
                color="inherit"
              >
                {post.is_sticky ? '取消置顶' : '置顶'}
              </DoTaskButton>
            ) : null
          }
        />
      ) : (
        <Typography textAlign="center" p={2} fontSize="smaller" sx={{ opacity: 0.5 }}>
          共 {thread?.post_count || ''} 条评论，无查看权限
        </Typography>
      )}
      <Box sx={{ height: 56 }} />
      <ButtonGroup
        variant="contained"
        sx={{ position: 'fixed', bottom: 20, right: 20, borderRadius: '50vh', overflow: 'hidden' }}
        size="large"
      >
        <Button
          variant="contained"
          startIcon={<AddCommentIcon />}
          onClick={async () => {
            history.push('?openReply=1');
            try {
              // 唤起评论弹窗后，开始检查评论权限
              const result = await postApi.checkCanCreate(threadId);
              if (!result.canCreate) {
                throw new Error(result.cantCreateReason || '评论前置校验失败');
              }
              if (ApiUI.checkBeforeCreatePost) {
                await ApiUI.checkBeforeCreatePost(thread);
              }
            } catch (e: any) {
              showAlert(e?.message || '评论前置校验失败');
            }
          }}
        >
          评论
        </Button>
        <Button
          startIcon={thread?.is_liked ? <ThumbUpIcon /> : <ThumbUpOutlinedIcon />}
          onClick={onClickToggleLike}
          sx={{ pl: 2, pr: 1.6 }}
        >
          {thread?.like_count || 0}
        </Button>
      </ButtonGroup>
      <OpenPopupMarkdownEditor
        open={openReplyDialog}
        title="添加评论"
        placeholder="请输入评论内容"
        onSubmitFailAlert
        clearAfterSubmit
        onSubmit={async (input) => {
          if (!input.replace(/\n/g, '').trim()) throw new Error('请输入评论内容');
          if (ApiUI.checkBeforeCreatePost) {
            await ApiUI.checkBeforeCreatePost(thread);
          }
          await postApi.create({ thread_id: threadId, content: input });
          thread.posted_at = new Date().toJSON();
          updateThreadInHistoryData(thread);
          setPostListReloadKey(postListReloadKey + 1);
          if (/> !\[\^mbbs_reply_visible_tag\^\]\(.+\)/.test(thread.content)) {
            // 部分内容评论后可见，重新加载帖子内容
            loadThread();
          }
        }}
        onOpenChange={async (open) => {
          if (!open) {
            history.goBack();
          }
        }}
      />
    </AppPage>
  );
}
