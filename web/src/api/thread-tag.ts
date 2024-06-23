import fetchApi from '@/api/base/fetch';

/** 帖子标签 */
export interface ThreadTag {
  /** 标签 id */
  id: number;
  /** 标签名称 */
  name: string;
  /** 标签说明 */
  description?: string;
  /** 标签图标 */
  icon?: string;
  /** 标签颜色 */
  color?: string;
  /** 标签背景色 */
  bgcolor?: string;
  /** 是否在 帖子列表/详情 隐藏显示(帖子详情-标签管理弹窗内仍会显示) */
  hidden_in_thread_view?: boolean;
  /** 限制在指定版块内使用，格式：1,3,4 （逗号分隔的版块ID） */
  limit_use_in_categories?: string;
  /** 限制指定的用户角色可以设置标签到帖子，格式：1,10,11 （逗号分隔的角色ID，-1代表帖子作者） */
  limit_use_by_groups?: string;
  /** 额外限制可阅读该标签帖子的角色，格式：-1,10,11,7 （逗号分隔的角色ID，-1代表帖子作者） */
  limit_thread_read_groups?: string;
  /** 额外限制可修改该标签帖子的角色，格式：-1,10,11 （逗号分隔的角色ID，-1代表帖子作者） */
  limit_thread_write_groups?: string;
  /** 创建时间 */
  created_at: string;
  /** 更新时间 */
  updated_at: string;
}

/** 列出所有标签 */
export async function listAllTag(): Promise<Array<ThreadTag>> {
  return await fetchApi('threadTag/listAllTag').then((resp) => resp.data);
}

/** 列出当前帖子的所有可添加标签 */
export async function listEditableTagForThread(threadId: string | number): Promise<Array<ThreadTag>> {
  return await fetchApi(`threadTag/listEditableTagForThread?thread_id=${threadId}`).then((resp) => resp.data);
}

/** 列出指定版块的所有可使用标签 */
export async function listEditableTagForCategory(categoryId?: string | number): Promise<Array<ThreadTag>> {
  if (!categoryId) {
    return await fetchApi(`threadTag/listEditableTagForAllCategory`).then((resp) => resp.data);
  }
  return await fetchApi(`threadTag/listEditableTagForCategory?category_id=${categoryId}`).then((resp) => resp.data);
}

/** 添加一个标签 */
export async function addTag(fields: Partial<ThreadTag>): Promise<ThreadTag> {
  return fetchApi({
    pathOrUrl: 'threadTag/addTag',
    method: 'post',
    data: fields,
  }).then((resp) => resp.data);
}

/** 删除一个标签 */
export async function removeTag(tagId: number): Promise<void> {
  return fetchApi({
    pathOrUrl: 'threadTag/removeTag',
    method: 'post',
    data: {
      tag_id: tagId,
    },
  }).then((resp) => resp.data);
}

/** 修改标签 */
export async function setTag(tagId: number | string, fields: Partial<ThreadTag>): Promise<ThreadTag> {
  return fetchApi({
    pathOrUrl: 'threadTag/setTag',
    method: 'post',
    data: {
      tag_id: tagId,
      ...fields,
    },
  }).then((resp) => resp.data);
}

/** 在帖子上 添加标签 */
export async function bindTagForThread(threadId: string | number, tagId: string | number): Promise<void> {
  await fetchApi({
    pathOrUrl: 'threadTag/bindTagForThread',
    method: 'post',
    data: {
      tag_id: tagId,
      thread_id: threadId,
    },
  });
}

/** 在帖子上 删除标签 */
export async function unbindTagForThread(threadId: string | number, tagId: string | number): Promise<void> {
  await fetchApi({
    pathOrUrl: 'threadTag/unbindTagForThread',
    method: 'post',
    data: {
      tag_id: tagId,
      thread_id: threadId,
    },
  });
}
