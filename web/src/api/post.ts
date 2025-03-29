import fetchApi from '@/api/base/fetch';
import { User } from '@/api/base/user';

/**
 * 帖子内容/帖子评论/评论回复 模型
 */
export interface Post {
  /** 评论 ID */
  id: number;
  /** 评论者 ID */
  user_id: number;
  /** 帖子 ID */
  thread_id: number;
  /** 回复所在的目标评论的 ID （当前数据是评论的一条回复） */
  reply_post_id: number;
  /** 回复所在的目标评论的 用户ID （当前数据是评论的一条回复） */
  reply_user_id: number;
  /** 指定回复目标评论的 ID （当前数据是评论的一条回复） */
  comment_post_id: number;
  /** 指定回复目标评论的 用户ID （当前数据是评论的一条回复） */
  comment_user_id: number;
  /** 内容 */
  content: string;
  /** 创建时的 ip */
  ip: string;
  /** 评论内的回复数量 / 帖子的回复数量 */
  reply_count: number;
  /** 点赞数量 */
  like_count: number;
  /** 是否合法 */
  is_approved: boolean;
  /** 是否是帖子内容 */
  is_first: boolean;
  /** 是否置顶 */
  is_sticky: boolean;
  /** 是否是评论回复 */
  is_comment: boolean;
  /** 删除的用户id */
  deleted_user_id: number;
  /** 创建时间 */
  created_at: string;
  /** 更新时间 */
  updated_at: string;
  /** 删除时间 */
  deleted_at: string;
  // UI 模型字段：
  user: User;
  comment_user?: User;
  is_liked: boolean;
  can_edit: boolean;
  can_hide: boolean;
  can_like: boolean;
  can_sticky: boolean;
}

export type PostSortKey = keyof Post | `-${keyof Post}`;

export interface ListPostParam {
  thread_id?: number | string;
  user_id?: number | string;
  like_by_user_id?: number | string;
  sort?: PostSortKey | Array<PostSortKey>;
  keywords?: string;
}

/** 列出帖子的评论 */
export function listPost(
  param: ListPostParam & {
    page_offset: number;
    page_limit: number;
  },
): Promise<{
  list: Post[];
  totalCount: number;
}> {
  return fetchApi({
    pathOrUrl: 'posts/list',
    method: 'get',
    data: {
      ...param,
      sort: Array.isArray(param.sort) ? param.sort.join(',') : [param.sort].filter(Boolean).join(','),
      thread_id: param.thread_id === '' ? undefined : param.thread_id,
      user_id: param.user_id === '' ? undefined : param.user_id,
      like_by_user_id: param.like_by_user_id === '' ? undefined : param.like_by_user_id,
    },
  }).then((resp) => ({
    list: resp.data,
    totalCount: resp.extra.totalCount,
  }));
}

/** 列出评论的回复（楼中楼） */
export function listComments(param: {
  post_id?: number | string;
  user_id?: number | string;
  keywords?: string;
  page_offset: number;
  page_limit: number;
  sort?: PostSortKey | Array<PostSortKey>;
}): Promise<{
  list: Post[];
  totalCount: number;
}> {
  return fetchApi({
    pathOrUrl: 'posts/listComments',
    method: 'get',
    data: param,
  }).then((resp) => ({
    list: resp.data,
    totalCount: resp.extra.totalCount,
  }));
}

/** 创建一条帖子评论 */
export function create(param: { thread_id: number | string; content: string }): Promise<Post> {
  return fetchApi({
    pathOrUrl: 'posts/create',
    method: 'post',
    data: param,
  }).then((resp) => resp.data);
}

/** 创建一条评论的回复 */
export function createComment(param: {
  post_id: number | string;
  content: string;
  /** 回复楼中楼中的指定评论 */
  comment_post_id?: number | string;
}): Promise<Post> {
  return fetchApi({
    pathOrUrl: 'posts/createComment',
    method: 'post',
    data: param,
  }).then((resp) => resp.data);
}

/** 修改一条帖子/回复 */
export function modify(param: { post_id: number | string; content: string }): Promise<Post> {
  return fetchApi({
    pathOrUrl: `posts/${param.post_id}`,
    method: 'post',
    data: { content: param.content },
  }).then((resp) => resp.data);
}

/** 删除一条帖子/回复 */
export function deletePost(post_id: number | string): Promise<void> {
  return fetchApi({
    pathOrUrl: `posts/${post_id}`,
    method: 'delete',
  }).then(() => {});
}

/** 批量删除 评论/回复 */
export function batchDeletePosts(post_ids: Array<number | string>): Promise<{ sucIds: number[] }> {
  return fetchApi({
    pathOrUrl: 'posts/batchDeletePosts',
    method: 'post',
    data: { ids: post_ids.join(',') },
  }).then((resp) => resp.data);
}

/** 点赞/取消点赞 一条评论/回复 */
export function setLike(param: { post_id: number | string; is_like: boolean }): Promise<void> {
  return fetchApi({
    pathOrUrl: 'posts/setLike',
    method: 'post',
    data: param,
  }).then(() => {});
}

/**
 * 检查是否能添加评论
 * @param thread_id
 */
export function checkCanCreate(thread_id: number | string): Promise<{
  canCreate: boolean;
  cantCreateReason: string;
}> {
  return fetchApi(`posts/checkCanCreate?thread_id=${thread_id}`).then((resp) => resp.data);
}

/** 置顶/取消置顶 一条评论 */
export function setSticky(param: { post_id: number | string; is_sticky: boolean }): Promise<void> {
  return fetchApi({
    pathOrUrl: 'posts/setSticky',
    method: 'post',
    data: param,
  }).then(() => {});
}
