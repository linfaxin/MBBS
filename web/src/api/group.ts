import fetchApi from '@/api/base/fetch';

/** 角色 */
export interface Group {
  /** 角色ID */
  id: number;
  /** 角色名称 */
  name: string;
  /** 角色图标 */
  icon: string;
  /** 是否为用户注册时的默认角色 */
  default: boolean;
  /** 创建时间 */
  created_at: string;
  /** 更新时间 */
  updated_at: string;
}

let listGroupCache: null | Promise<Group[]>;

/** 列出所有角色 */
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

/** 添加角色 */
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

/** 修改角色 */
export async function setGroup(groupId: number | string, fields: Partial<Group>): Promise<Group> {
  return fetchApi({
    pathOrUrl: 'group/setGroup',
    method: 'post',
    data: {
      group_id: groupId,
      group_name: fields?.name,
      group_icon: fields?.icon,
    },
  }).then((resp) => {
    listGroupCache = null;
    return resp.data;
  });
}

/** 设置角色为 新用户默认角色 */
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

/** 删除一个角色 */
export function removeGroup(groupId: string | number): Promise<void> {
  return fetchApi({
    pathOrUrl: 'group/removeGroup',
    method: 'post',
    data: { group_id: groupId },
  }).then((resp) => {
    listGroupCache = null;
  });
}
