import React, { useMemo } from 'react';
import AppPageList, { PageListProps } from '@/components/app-page-list';
import { Box, Button, Card, Divider, IconButton, MenuItem, Select, Typography, useTheme } from '@mui/material';
import { postApi } from '@/api';
import AppLink from '@/components/app-link';
import { getResourceUrl } from '@/utils/resource-url';
import { formatTimeFriendly } from '@/utils/format-util';
import { getPageStateWhenPop, setPageState, usePageState } from '@/utils/use-page-history-hooks';
import { history } from 'umi';
import { Post, PostSortKey } from '@/api/post';
import { showConfirm } from '@/utils/show-alert';
import OpenPopoverMenu from '@/components/open-popover-menu';
import showPromptDialog from '@/utils/show-prompt-dialog';
import ApiUI from '@/api-ui';
import { useScreenWidthUpMD } from '@/utils/use-screen-width';
import style from '@/components/post-list/index.less';
import showSnackbar from '@/utils/show-snackbar';
import OpenPromptDialog from '@/components/open-prompt-dialog';
import SearchIcon from '@mui/icons-material/Search';

let listReloadKeyIdNext = 0;

const UserPostCommentList: React.FC<
  Partial<PageListProps> & {
    userId?: number | string;
  }
> = (props) => {
  const { userId, listReloadKey, ...listProps } = props;
  const [totalCount, setTotalCount] = usePageState<number>(`user-post-comment-list-${userId}.totalCount`);
  const [commentList, setCommentList] = usePageState<Post[]>(`user-post-comment-list-${userId}`, []);
  const [sort, setSort] = usePageState<PostSortKey>('user-post-comment-list.sort', '-created_at');
  const [keywords, setKeywords] = usePageState<string>('user-post-comment-list.keywords', '');
  const listReloadKeyId = useMemo(() => listReloadKeyIdNext++, [listReloadKey]);
  const isWidthUpDM = useScreenWidthUpMD();
  const theme = useTheme();

  const loadPage = async (pageNo: number) => {
    if (pageNo === 1) setCommentList([]);
    const pageSize = 20;
    const { list, totalCount } = await postApi.listComments({
      user_id: userId,
      sort,
      keywords,
      page_offset: (pageNo - 1) * pageSize,
      page_limit: pageSize,
    });
    setCommentList(pageNo === 1 ? list : [...commentList, ...list]);
    setTotalCount(totalCount);
    if (list?.length > 0) {
      setPageState('user-post-comment-list', pageNo + 1);
    }
    return {
      hasMore: list.length >= pageSize,
      list: list,
    };
  };
  return (
    <AppPageList
      {...listProps}
      listReloadKey={`${listReloadKeyId}_${userId}_${sort}_${keywords}`}
      loadPage={loadPage}
      defaultPageNo={getPageStateWhenPop('user-post-comment-list.next-page-no') || 1}
      useBodyScroll
      renderListNoMoreFoot={
        <Typography textAlign="center" p={2} fontSize="smaller" sx={{ opacity: 0.5 }}>
          回复加载完毕
        </Typography>
      }
      renderPageEmpty={
        <Typography textAlign="center" p={2} sx={{ opacity: 0.6 }}>
          {keywords ? (
            <>
              未搜索到回复
              <br />
              <Button onClick={setKeywords.bind(this, '')}>清空搜索关键字</Button>
            </>
          ) : (
            <span style={{ opacity: 0.6 }}>暂无回复</span>
          )}
        </Typography>
      }
    >
      {!!commentList?.length && (
        <Card
          sx={{ background: theme.palette.background.paper }}
          elevation={isWidthUpDM ? undefined : 0}
          square={!isWidthUpDM}
          variant={isWidthUpDM ? 'outlined' : 'elevation'}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', paddingLeft: 2, minHeight: 40 }}>
            <Typography fontSize="smaller">
              回复数：{totalCount}
              {keywords ? `(搜索：${keywords})` : ''}
            </Typography>
            <div style={{ flex: 1 }} />
            <Select
              size="small"
              className={style.sort_select_button}
              sx={{ fontSize: 'smaller' }}
              value={sort}
              onChange={(e) => setSort(e.target.value as PostSortKey)}
            >
              <MenuItem value="created_at">最早</MenuItem>
              <MenuItem value="-created_at">最新</MenuItem>
            </Select>
            <Divider orientation="vertical" sx={{ height: 20 }} />
            <OpenPromptDialog title="搜索回复" inputLabel="关键字" defaultValue={keywords} onSubmit={setKeywords}>
              <IconButton color={keywords ? 'primary' : 'inherit'}>
                <SearchIcon />
              </IconButton>
            </OpenPromptDialog>
          </Box>
          <Divider orientation="horizontal" />
          {commentList.map((comment, index) => (
            <React.Fragment key={comment.id}>
              <Box sx={{ display: 'flex', alignItems: 'center', fontSize: 'smaller', p: 2 }}>
                <Box sx={{ flex: 1, wordBreak: 'break-all', pt: '6px', pb: '6px' }}>
                  <AppLink href={`/user/detail?id=${comment.user_id}`}>
                    <img
                      alt="avatar"
                      src={getResourceUrl(comment.user.avatar) || require('@/images/default-avatar.png')}
                      style={{ height: 20, width: 20, verticalAlign: 'bottom' }}
                    />
                    <span style={{ marginLeft: 4 }}>{comment.user.nickname || comment.user.username}</span>
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
                        <span style={{ marginLeft: 4 }}>{comment.comment_user.nickname || comment.comment_user.username}</span>
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
                        label: '查看帖子',
                        onClick: () => history.push(`/thread/detail/${comment.thread_id}`),
                      },
                      comment.can_edit && {
                        label: '编辑',
                        onClick: () =>
                          showPromptDialog({
                            title: '编辑回复',
                            defaultValue: comment.content,
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
              {index < commentList.length - 1 && <Divider orientation="horizontal" />}
            </React.Fragment>
          ))}
        </Card>
      )}
    </AppPageList>
  );
};

export default UserPostCommentList;
