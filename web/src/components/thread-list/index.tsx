import React, { ReactNode, useState } from 'react';
import { useRequest, useUpdateEffect } from 'ahooks';
import {
  Box,
  Button,
  Card,
  Chip,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Select,
  Typography,
  useTheme,
} from '@mui/material';
import ModeCommentIcon from '@mui/icons-material/ModeComment';
import SearchIcon from '@mui/icons-material/Search';
import { useScreenWidthUpMD } from '@/utils/use-screen-width';
import { categoryApi, threadApi } from '@/api';
import AppLink from '@/components/app-link';
import AppPageList, { PageListProps } from '@/components/app-page-list';
import { ListThreadParam, Thread, ThreadSortKey } from '@/api/thread';
import { getResourceUrl } from '@/utils/resource-url';
import { formatTimeFriendly } from '@/utils/format-util';
import OpenPromptDialog from '@/components/open-prompt-dialog';
import { getPageStateWhenPop, setPageState, usePageState } from '@/utils/use-page-history-hooks';
import { hasViewThread } from '@/utils/view-thread-records-util';
import ShowThreadContentMatchKeywords from '@/components/thread-list/show-thread-content-match-keywords';
import { ThreadTag } from '@/api/thread-tag';
import { getCategoryFullName } from '@/api/category';
import ThreadTagSelect from '@/components/thread-tag-select';
import style from './index.less';

const ThreadList: React.FC<
  Partial<PageListProps> & {
    queryParam: ListThreadParam;
    enablePullRefreshLoad?: boolean;
    showCategoryName?: boolean;
    filterableThreadTags?: ThreadTag[];
    filterableThreadSelectExtraItems?: ReactNode;
    onClickThread?: (thread: Thread) => void;
    renderActions?: (thread: Thread, reRender: () => void) => React.ReactNode;
    renderAfterListTitleThreadCount?: (threads: Thread[], reLoad: () => void) => React.ReactNode;
  }
> = (props) => {
  const {
    queryParam,
    listReloadKey,
    enablePullRefreshLoad = true,
    showCategoryName,
    filterableThreadTags,
    filterableThreadSelectExtraItems,
    onClickThread,
    renderActions,
    renderAfterListTitleThreadCount,
    ...listProps
  } = props;
  const isWidthUpDM = useScreenWidthUpMD();
  const theme = useTheme();
  const [sort, setSort] = usePageState<ThreadSortKey>(
    'thread-list.sort',
    ((Array.isArray(queryParam.sort) ? queryParam.sort[0] : queryParam.sort) as ThreadSortKey) || '-posted_at',
  );
  const [keywords, setKeywords] = usePageState<string>('thread-list.keywords', queryParam.keywords);
  const [filterThreadTagIds, setFilterThreadTagIds] = usePageState<string>('thread-list.filterTags', queryParam.filter_thread_tag_ids);
  const [totalCount, setTotalCount] = usePageState<number | string>('thread-list.totalCount');
  const [threadList, setThreadList] = usePageState<Thread[]>('thread-list', []);
  const forceUpdate = () => setThreadList([...threadList]);
  const { data: categories } = useRequest(() => categoryApi.listCategory());
  const [listReloadKeyId, setListReloadKeyId] = useState(0);
  useUpdateEffect(() => {
    setListReloadKeyId((prev) => prev + 1);
  }, [listReloadKey]);

  const loadPage = async (pageNo: number) => {
    if (pageNo === 1) setThreadList([]);
    const pageSize = 20;
    const { list, totalCount } = await threadApi.listThread({
      ...queryParam,
      sort,
      keywords,
      filter_thread_tag_ids: filterThreadTagIds,
      page_offset: (pageNo - 1) * pageSize,
      page_limit: pageSize,
    });
    setTotalCount(totalCount);
    setThreadList(pageNo === 1 ? list : [...threadList, ...list]);
    if (list?.length > 0) {
      setPageState('thread-list.next-page-no', pageNo + 1);
    }
    return {
      hasMore: list.length >= pageSize,
      list: list,
    };
  };
  return (
    <AppPageList
      {...listProps}
      defaultPageNo={getPageStateWhenPop('thread-list.next-page-no') || 1}
      listReloadKey={`${listReloadKeyId}_${JSON.stringify({ ...queryParam, sort, keywords, filterThreadTagIds })}`}
      loadPage={loadPage}
      pullRefreshLoad={enablePullRefreshLoad ? loadPage.bind(this, 1) : undefined}
      useBodyScroll
      renderListNoMoreFoot={
        <Typography sx={{ textAlign: 'center', padding: 2, opacity: 0.5 }} fontSize="smaller">
          帖子加载完毕
        </Typography>
      }
      renderPageEmpty={
        <Typography textAlign="center" p={2} component="div">
          {keywords || filterThreadTagIds ? (
            <>
              <span>未搜索到帖子</span>
              <div style={{ height: 20 }} />
              <div hidden={!keywords}>
                <Button onClick={setKeywords.bind(this, '')}>清空搜索关键字</Button>
              </div>
              <div hidden={!filterThreadTagIds}>
                <Button onClick={setFilterThreadTagIds.bind(this, '')}>清空筛选标签</Button>
              </div>
            </>
          ) : (
            <span style={{ opacity: 0.6 }}>暂无帖子</span>
          )}
        </Typography>
      }
    >
      <Card
        sx={{ background: theme.palette.background.paper }}
        elevation={isWidthUpDM ? undefined : 0}
        square={!isWidthUpDM}
        variant={isWidthUpDM ? 'outlined' : 'elevation'}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', paddingLeft: 2, minHeight: 40 }}>
          <Typography fontSize="smaller" whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis">
            帖子数：{totalCount}
            {keywords ? `(搜索：${keywords})` : ''}
          </Typography>
          {renderAfterListTitleThreadCount?.(threadList, () => setListReloadKeyId((prev) => prev + 1))}
          <div style={{ flex: 1 }} />
          {!!filterableThreadTags?.length && (
            <ThreadTagSelect
              label=""
              threadTags={filterableThreadTags}
              multiple
              value={
                filterThreadTagIds
                  ?.split(',')
                  .filter(Boolean)
                  .map((v) => parseInt(v)) || []
              }
              onChange={(tags) => setFilterThreadTagIds(String(tags))}
              extraMenuItems={filterableThreadSelectExtraItems}
              SelectProps={{
                displayEmpty: true,
                className: style.sort_select_button,
                renderValue: (v) => ((v as any)?.length ? '筛选*' : '筛选'),
                SelectDisplayProps: {
                  style: { fontWeight: filterThreadTagIds ? 'bold' : 'normal' },
                },
              }}
            />
          )}
          <Select
            size="small"
            className={style.sort_select_button}
            sx={{ fontSize: 'smaller' }}
            value={sort}
            onChange={(e) => setSort(e.target.value as ThreadSortKey)}
          >
            <MenuItem value="-posted_at">最新回复</MenuItem>
            <MenuItem value="-created_at">最新发帖</MenuItem>
            <MenuItem value="-modified_at">最新修改</MenuItem>
            <MenuItem value="created_at">最旧发帖</MenuItem>
          </Select>
          <Divider orientation="vertical" sx={{ height: 20 }} />
          <OpenPromptDialog title="搜索帖子" inputLabel="关键字" defaultValue={keywords} onSubmit={setKeywords}>
            <IconButton color={keywords ? 'primary' : 'inherit'}>
              <SearchIcon />
            </IconButton>
          </OpenPromptDialog>
        </Box>
        <Divider orientation="horizontal" />
        <List sx={{ paddingBottom: 0, paddingTop: 0 }}>
          {threadList.map((thread, index) => (
            <React.Fragment key={index}>
              <AppLink
                href={onClickThread ? undefined : `/thread/detail/${thread.id}`}
                onClick={onClickThread ? () => onClickThread(thread) : undefined}
              >
                <ListItemButton>
                  <ListItemText
                    primary={
                      <>
                        <Typography
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            opacity: hasViewThread(thread.id) ? 0.6 : 1,
                            wordBreak: 'break-all',
                            display: '-webkit-box',
                            WebkitBoxOrient: 'vertical',
                            WebkitLineClamp: 2,
                          }}
                        >
                          {thread.thread_tags.map((tag) =>
                            tag.hidden_in_thread_view ? null : (
                              <React.Fragment key={tag.id}>
                                {tag.icon ? (
                                  <img
                                    alt="icon"
                                    src={getResourceUrl(tag.icon)}
                                    style={{ height: 16, verticalAlign: 'text-bottom', paddingRight: 4 }}
                                  />
                                ) : (
                                  <Chip
                                    size="small"
                                    label={tag.name}
                                    sx={{ marginRight: 0.6, verticalAlign: 'top', color: tag.color, bgcolor: tag.bgcolor }}
                                    component="span"
                                  />
                                )}
                              </React.Fragment>
                            ),
                          )}
                          {keywords
                            ? thread.title.split(keywords).map((w, index, arr) =>
                                index > 0 ? (
                                  <React.Fragment key={index}>
                                    <span style={{ color: '#f73131' }}>{keywords}</span>
                                    {w}
                                  </React.Fragment>
                                ) : (
                                  w
                                ),
                              )
                            : thread.title}
                        </Typography>
                      </>
                    }
                    secondary={
                      <>
                        {keywords ? <ShowThreadContentMatchKeywords keywords={keywords} thread={thread} /> : null}
                        <Box sx={{ display: 'flex', alignItems: 'center', marginTop: 1 }}>
                          <img
                            alt="avatar"
                            src={getResourceUrl(thread.user.avatar) || require('@/images/default-avatar.png')}
                            style={{ height: 20, width: 20 }}
                          />
                          <span
                            style={{
                              marginLeft: 4,
                              wordBreak: 'break-all',
                            }}
                          >
                            {thread.user.nickname || thread.user.username}
                            {!!thread.user.group?.icon && (
                              <img
                                alt="icon"
                                src={getResourceUrl(thread.user.group.icon)}
                                style={{ height: 16, verticalAlign: 'text-bottom', paddingLeft: 2 }}
                              />
                            )}
                          </span>
                          <span
                            style={{
                              marginLeft: 12,
                              opacity: 0.6,
                              flex: 'none',
                            }}
                          >
                            {sort === '-modified_at'
                              ? `${formatTimeFriendly(thread.modified_at)}修改`
                              : !thread.reply_count || sort === '-created_at' || sort === 'created_at'
                              ? `${formatTimeFriendly(thread.created_at)}创建`
                              : `${formatTimeFriendly(thread.posted_at)}回复`}
                          </span>
                          {showCategoryName && (
                            <span style={{ marginLeft: 12, opacity: 0.6 }}>
                              {getCategoryFullName((categories || []).find((c) => c.id == thread.category_id))}
                            </span>
                          )}
                          <span style={{ flex: 1 }} />
                          <ModeCommentIcon sx={{ fontSize: 16, flex: 'none' }} />
                          <span style={{ marginLeft: 2, flex: 'none' }}>{thread.reply_count}</span>
                        </Box>
                      </>
                    }
                    secondaryTypographyProps={{ component: 'div' }}
                  />
                </ListItemButton>
              </AppLink>
              {renderActions && (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                    {renderActions(thread, forceUpdate)}
                  </Box>
                </>
              )}
              {index < threadList.length - 1 && <Divider orientation="horizontal" />}
            </React.Fragment>
          ))}
        </List>
      </Card>
    </AppPageList>
  );
};

export default ThreadList;
