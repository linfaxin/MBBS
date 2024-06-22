import { User } from '@/api/base/user';
import fetchApi from '@/api/base/fetch';
import { ThreadTag } from '@/api/thread-tag';

/**
 * 帖子模型
 */
export interface Thread {
  /** 帖子 ID */
  id: number;
  /** 帖子作者 */
  user_id: number;
  /** 最后回复的用户id */
  last_posted_user_id: number;
  /** 分类id */
  category_id: number;
  /** 帖子内容 ID */
  first_post_id: number;
  /** 类型（预留，和 discuzQ 保持一致，目前所有都是1） */
  type: 1;
  /** 是否合法 */
  is_approved: ThreadIsApproved;
  /** 是否在所属板块置顶 */
  is_sticky: boolean;
  /** 是否同时在其他板块置顶，值格式：1,3(逗号分隔的板块 ID) */
  sticky_at_other_categories: string;
  /** 是否精华 */
  is_essence: boolean;
  /** 是否是草稿箱帖子 */
  is_draft: boolean;
  /** 帖子名称 */
  title: string;
  /**
   * 帖子回复数量（默认第一条回复为帖子本身的内容，所以数量至少为1）
   * @deprecated 请使用 reply_count
   */
  post_count: number;
  /** 阅读数 */
  view_count: number;
  /** 删除的用户id */
  deleted_user_id: number;
  /** 最后回复时间 */
  posted_at: string;
  /** 创建时间 */
  created_at: string;
  /** 更新时间 */
  updated_at: string;
  /** 删除时间 */
  deleted_at: string | null;
  /** 内容/标题上次修改时间 */
  modified_at: string;
  // 以下字段为 UI 层模型附加
  /** 帖子内容 */
  content: string;
  /** 帖子内容（纯文本，用于索引） */
  content_for_indexes: string;
  /** 帖子用户 */
  user: User;
  /** 帖子喜欢数量 */
  like_count: number;
  /** 帖子回复数量 */
  reply_count: number;
  /** 当前登录用户是否已喜欢 */
  is_liked: boolean;
  /** 当前登录用户是否能编辑 */
  can_edit: boolean;
  /** 当前登录用户是否能删除 */
  can_hide: boolean;
  /** 当前登录用户是否能喜欢 */
  can_like: boolean;
  /** 当前登录用户是否能评论 */
  can_reply: boolean;
  /** 当前登录用户是否能设置精华 */
  can_essence: boolean;
  /** 当前登录用户是否能设置置顶 */
  can_sticky: boolean;
  /** 当前登录用户是否能查看评论 */
  can_view_posts: boolean;
  /** 当前登录用户是否能修改评论设置 */
  can_set_disable_post: boolean;
  /** 帖子上设置的"评论关闭"字段 */
  disable_post: boolean | null;
  /** 帖子上的所有标签 */
  thread_tags: ThreadTag[];
}

export enum ThreadIsApproved {
  /** 审核中 */
  checking = 0,
  /** 正常 */
  ok = 1,
  /** 审核失败 */
  check_failed = 2,
}

export const AllEnumThreadIsApproved: ThreadIsApproved[] = [ThreadIsApproved.checking, ThreadIsApproved.ok, ThreadIsApproved.check_failed];

export type ThreadSortKey = keyof Thread | `-${keyof Thread}`;

export interface ListThreadParam {
  category_id?: number | string;
  thread_id?: number | string;
  user_id?: number | string;
  keywords?: string;
  is_essence?: boolean;
  is_sticky?: boolean;
  /** 支持逗号分割的多个状态 */
  is_approved?: ThreadIsApproved | string;
  filter_thread_tag_id?: number | string;
  is_deleted?: boolean;
  created_at_begin?: Date;
  created_at_end?: Date;
  sort?: ThreadSortKey | Array<ThreadSortKey>;
}

/** 查询帖子列表 */
export function listThread(
  param: ListThreadParam & {
    page_offset: number;
    page_limit: number;
  },
): Promise<{
  list: Thread[];
  totalCount: number;
}> {
  return fetchApi({
    pathOrUrl: 'threads/list',
    method: 'get',
    data: {
      ...param,
      sort: Array.isArray(param.sort) ? param.sort.join(',') : [param.sort].filter(Boolean).join(','),
      thread_id: param.thread_id === '' ? undefined : param.thread_id,
      category_id: param.category_id === '' ? undefined : param.category_id,
      user_id: param.user_id === '' ? undefined : param.user_id,
      is_approved: Array.isArray(param.is_approved)
        ? param.is_approved.join(',')
        : [param.is_approved].filter((n) => typeof n === 'number').join(','),
    },
  }).then((resp) => ({
    list: resp.data,
    totalCount: resp.extra.totalCount,
  }));
}

/** 查询帖子数量 */
export function countThread(param?: Omit<ListThreadParam, 'sort'>): Promise<number> {
  return listThread({
    ...param,
    page_limit: 0,
    page_offset: 0,
  }).then((data) => data.totalCount);
}

/** 检查当前用户能否在指定版块发帖 */
export function checkCanCreate(category_id: number | string): Promise<{
  canCreate: boolean;
  cantCreateReason?: string;
  todayCreateCount?: number;
  categoryCreateLimit?: number;
  siteCreateLimit?: number;
}> {
  return fetchApi({
    pathOrUrl: 'threads/checkCanCreate',
    method: 'post',
    data: { category_id },
  }).then((resp) => resp.data);
}

/** 发表帖子 */
export function create(param: { title: string; content: string; category_id: string | number; is_draft?: boolean }): Promise<Thread> {
  return fetchApi({
    pathOrUrl: 'threads/create',
    method: 'post',
    data: param,
  }).then((resp) => resp.data);
}

/** 修改帖子 */
export function modify(
  thread_id: string | number,
  param: {
    title: string;
    content: string;
    category_id: string | number;
    is_draft?: boolean;
  },
): Promise<Thread> {
  return fetchApi({
    pathOrUrl: `threads/${thread_id}`,
    method: 'post',
    data: param,
  }).then((resp) => resp.data);
}

/** 删除帖子 */
export async function deleteThread(threadId: number | string): Promise<void> {
  await fetchApi({
    pathOrUrl: `threads/${threadId}`,
    method: 'delete',
  });
}

/** 批量删除 帖子 */
export function batchDelete(thread_ids: Array<number | string>): Promise<{ sucIds: number[] }> {
  return fetchApi({
    pathOrUrl: 'threads/batchDelete',
    method: 'post',
    data: { ids: thread_ids.join(',') },
  }).then((resp) => resp.data);
}

/** 撤销删除帖子 */
export async function restoreDeleteThread(threadId: number | string): Promise<void> {
  await fetchApi({
    pathOrUrl: `threads/restoreDelete?thread_id=${threadId}`,
    method: 'post',
  });
}

/** 设置审核状态 */
export async function setApproved(threadId: number | string, is_approved: number | string, approve_fail_reason?: string): Promise<void> {
  await fetchApi({
    pathOrUrl: 'threads/setApproved',
    method: 'post',
    data: {
      thread_id: threadId,
      is_approved,
      approve_fail_reason,
    },
  });
}

/** 设置置顶状态 */
export async function setSticky(threadId: number | string, is_sticky: boolean, sticky_at_other_categories?: string): Promise<void> {
  await fetchApi({
    pathOrUrl: 'threads/setSticky',
    method: 'post',
    data: {
      thread_id: threadId,
      is_sticky,
      sticky_at_other_categories,
    },
  });
}

/** 设置是否精华 */
export async function setEssence(threadId: number | string, is_essence: boolean): Promise<void> {
  await fetchApi({
    pathOrUrl: 'threads/setEssence',
    method: 'post',
    data: {
      thread_id: threadId,
      is_essence,
    },
  });
}

/** 设置点赞状态 */
export async function setLike(threadId: number | string, is_like: boolean): Promise<void> {
  await fetchApi({
    pathOrUrl: 'threads/setLike',
    method: 'post',
    data: {
      thread_id: threadId,
      is_like,
    },
  });
}

/** 设置评论开关状态 */
export async function setDisablePost(threadId: number | string, disablePost: boolean | null): Promise<void> {
  await fetchApi({
    pathOrUrl: 'threads/setDisablePost',
    method: 'post',
    data: {
      thread_id: threadId,
      disable_post: disablePost,
    },
  });
}

/** 获取帖子详情 */
export async function getThread(threadId: number | string): Promise<Thread> {
  const resp = await fetchApi({
    pathOrUrl: `threads/${threadId}`,
    method: 'get',
  });
  return resp.data;
}

/** 获取帖子详情(admin) */
export async function getThreadForAdmin(threadId: number | string): Promise<Thread> {
  const resp = await fetchApi({
    pathOrUrl: `threads/getForAdmin?id=${threadId}`,
    method: 'get',
  });
  return resp.data;
}

/** 查询我的帖子草稿列表 */
export function listMyDrafts(param: { category_id?: number | string }): Promise<{
  list: Thread[];
  totalCount: number;
}> {
  return fetchApi({
    pathOrUrl: 'threads/listMyDrafts',
    method: 'get',
    data: param,
  }).then((resp) => ({
    list: resp.data,
    totalCount: resp.extra.totalCount,
  }));
}
