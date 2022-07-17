/** 角色 */
import fetchApi from '@/api/base/fetch';

export interface Group {
  /** 分组ID */
  id: number;
  /** 分组名称 */
  name: string;
  /** 是否为用户注册时的默认分组 */
  default: boolean;
  /** 创建时间 */
  created_at: string;
  /** 更新时间 */
  updated_at: string;
}

let listGroupCache: null | Promise<Group[]>;

/** 列出所有分组 */
export async function listGroup(ignoreCache = false) {
  if (ignoreCache || !listGroupCache) {
    listGroupCache = fetchApi('group/listGroup')
      .then((resp) => resp.data)
      .catch((e) => {
        listGroupCache = null;
        throw e;
      });
  }
  return listGroupCache;
}

/** 添加分组 */
export async function addGroup(groupName: string): Promise<Group> {
  return fetchApi({
    pathOrUrl: 'group/addGroup',
    method: 'post',
    data: {
      group_name: groupName,
    },
  }).then((resp) => {
    listGroupCache = null;
    return resp.data;
  });
}

/** 修改分组名称 */
export async function setGroupName(groupId: number | string, groupName: string): Promise<Group> {
  return fetchApi({
    pathOrUrl: 'group/setGroup',
    method: 'post',
    data: {
      group_id: groupId,
      group_name: groupName,
    },
  }).then((resp) => {
    listGroupCache = null;
    return resp.data;
  });
}

/** 设置分组为 新用户默认分组 */
export async function setGroupIsDefault(groupId: number | string): Promise<Group> {
  return fetchApi({
    pathOrUrl: 'group/setGroup',
    method: 'post',
    data: {
      group_id: groupId,
      group_default: true,
    },
  }).then((resp) => {
    listGroupCache = null;
    return resp.data;
  });
}

/** 删除一个分组 */
export function removeGroup(groupId: string | number): Promise<void> {
  return fetchApi({
    pathOrUrl: 'group/removeGroup',
    method: 'post',
    data: { group_id: groupId },
  }).then((resp) => {
    listGroupCache = null;
  });
}
