import React, { useState } from 'react';
import { useUpdateEffect } from 'ahooks';
import AppPageList, { PageListProps } from '@/components/app-page-list';
import PageList from 'rmc-pagelist';
import { Box, Button, Card, Divider, IconButton, MenuItem, Select, Typography, useTheme } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useScreenWidthUpMD } from '@/utils/use-screen-width';
import { postApi } from '@/api';
import { getPageStateWhenPop, setPageState, usePageState } from '@/utils/use-page-history-hooks';
import { ListPostParam, Post, PostSortKey } from '@/api/post';
import OpenPromptDialog from '@/components/open-prompt-dialog';
import PostItem from '@/components/post-list/post-item';
import style from './index.less';
import OpenPopoverMenu from '@/components/open-popover-menu';
import { useModel } from '@@/plugin-model/useModel';
import showSnackbar from '@/utils/show-snackbar';
import { showConfirm } from '@/utils/show-alert';
import { GROUP_ID_ADMIN } from '@/consts';

const PostList: React.FC<
  Partial<PageListProps> & {
    queryParam: ListPostParam;
    enablePullRefreshLoad?: boolean;
    renderExtraActions?: (post: Post, reRender: () => void) => React.ReactNode;
  }
> = (props) => {
  const { queryParam, listReloadKey, enablePullRefreshLoad, renderExtraActions, ...listProps } = props;
  const loginUserModel = useModel('useLoginUser');
  const isWidthUpDM = useScreenWidthUpMD();
  const theme = useTheme();
  const [sort, setSort] = usePageState<PostSortKey>(
    'post-list.sort',
    ((Array.isArray(queryParam.sort) ? queryParam.sort[0] : queryParam.sort) as PostSortKey) || 'created_at',
  );
  const [totalCount, setTotalCount] = usePageState<number>('post-list.totalCount');
  const [postList, setPostList] = usePageState<Post[]>('post-list', []);
  const [keywords, setKeywords] = usePageState<string>('post-list.keywords', '');
  const [listReloadKeyId, setListReloadKeyId] = useState(0);
  useUpdateEffect(() => {
    setListReloadKeyId((prev) => prev + 1);
  }, [listReloadKey]);

  const loadPage = async (pageNo: number) => {
    if (pageNo === 1) setPostList([]);
    const pageSize = 20;
    const { list, totalCount } = await postApi.listPost({
      ...queryParam,
      sort,
      page_offset: (pageNo - 1) * pageSize,
      page_limit: pageSize,
      keywords,
    });
    setTotalCount(totalCount);
    setPostList(pageNo === 1 ? list : [...postList, ...list]);
    if (list?.length > 0) {
      setPageState('post-list.next-page-no', pageNo + 1);
    }
    return {
      hasMore: list.length >= pageSize,
      list: list,
    };
  };
  return (
    <AppPageList
      {...listProps}
      defaultPageNo={getPageStateWhenPop('post-list.next-page-no') || 1}
      listReloadKey={`${listReloadKeyId}_${JSON.stringify({ ...queryParam, sort, keywords })}`}
      loadPage={loadPage}
      pullRefreshLoad={enablePullRefreshLoad ? loadPage.bind(this, 1) : undefined}
      useBodyScroll={!enablePullRefreshLoad}
      renderListNoMoreFoot={
        <Typography textAlign="center" p={2} fontSize="smaller" sx={{ opacity: 0.5 }}>
          评论加载完毕
        </Typography>
      }
      renderPageEmpty={
        <Typography textAlign="center" p={2}>
          {keywords ? (
            <>
              未搜索到评论
              <br />
              <Button onClick={setKeywords.bind(this, '')}>清空搜索关键字</Button>
            </>
          ) : (
            <span style={{ opacity: 0.6 }}>暂无评论</span>
          )}
        </Typography>
      }
      renderPageError={(pageNo: number, error: any, list: PageList) =>
        pageNo === 1 ? (
          (error?.message || String(error)).indexOf('已关闭评论') !== -1 ? (
            <Typography sx={{ textAlign: 'center', p: 2, opacity: 0.6, fontSize: 14 }}>{error?.message || String(error)}</Typography>
          ) : (
            <Box sx={{ textAlign: 'center', padding: 4 }}>
              <Typography sx={{ fontSize: 14 }}>{error?.message || String(error)}</Typography>
              <Button variant="outlined" onClick={() => list.onClickLoadingError()} sx={{ marginTop: 1 }}>
                点击重试
              </Button>
            </Box>
          )
        ) : (
          (null as any)
        )
      }
    >
      {!!postList?.length && (
        <Card
          sx={{ background: theme.palette.background.paper }}
          elevation={isWidthUpDM ? undefined : 0}
          square={!isWidthUpDM}
          variant={isWidthUpDM ? 'outlined' : 'elevation'}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', paddingLeft: 2, minHeight: 40 }}>
            <Typography fontSize="smaller">
              评论数：{totalCount}
              {keywords ? `(搜索：${keywords})` : ''}
            </Typography>
            {loginUserModel.user?.group?.id === GROUP_ID_ADMIN && (
              <OpenPopoverMenu
                options={[
                  {
                    label: (
                      <div>
                        <div>删除显示的 {postList.length} 条评论</div>
                        <div style={{ fontSize: 12, opacity: 0.7 }}>该功能仅系统管理员可见</div>
                      </div>
                    ),
                    onClick: () => {
                      showConfirm({
                        title: '删除确认',
                        message: `确认删除当前列表显示中的 ${postList.length} 条评论吗？`,
                        onOkErrorAlert: true,
                        onOk: async () => {
                          const { sucIds } = await postApi.batchDeletePosts(postList.map((p) => p.id));
                          showSnackbar(`已删除 ${sucIds.length} 条评论`);
                          setListReloadKeyId((prev) => prev + 1);
                        },
                      });
                    },
                  },
                ]}
              />
            )}
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
              <MenuItem value="-like_count">最多点赞</MenuItem>
            </Select>
            <Divider orientation="vertical" sx={{ height: 20 }} />
            <OpenPromptDialog title="搜索评论" inputLabel="关键字" defaultValue={keywords} onSubmit={setKeywords}>
              <IconButton color={keywords ? 'primary' : 'inherit'}>
                <SearchIcon />
              </IconButton>
            </OpenPromptDialog>
          </Box>
          <Divider orientation="horizontal" />
          {postList.map((post, index) => (
            <React.Fragment key={post.id}>
              <PostItem
                post={post}
                postList={postList}
                setPostList={(newPostList) => {
                  setPostList(newPostList);
                  setTotalCount(newPostList.length);
                }}
                renderExtraActions={renderExtraActions}
              />
              {index < postList.length - 1 && <Divider orientation="horizontal" />}
            </React.Fragment>
          ))}
        </Card>
      )}
    </AppPageList>
  );
};

export default PostList;
