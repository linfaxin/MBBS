import fetchApi, { HEADER_TOKEN } from '@/api/base/fetch';
import { formatUserField, User, UserStatus } from '@/api/base/user';

export async function getLoginUserByToken(token: string): Promise<User> {
  const resp = await fetchApi({
    pathOrUrl: '/users/getLoginUser',
    method: 'get',
    headers: token ? { [HEADER_TOKEN]: token } : {},
  });
  const user = resp.data as User;
  formatUserField(user);
  return user;
}

export async function getUserById(id: number | string): Promise<User> {
  const resp = await fetchApi({
    pathOrUrl: `/users/${id}`,
    method: 'get',
  });
  const user = resp.data as User;
  formatUserField(user);
  return user;
}

export async function getUserByName(username: string): Promise<User> {
  const resp = await fetchApi({
    pathOrUrl: `/users/getByName?name=${username}`,
    method: 'get',
  });
  const user = resp.data as User;
  formatUserField(user);
  return user;
}

export async function modifyUser(param: {
  id: number;
  nickname?: string;
  avatar?: string;
  signature?: string;
  status?: UserStatus;
  reject_reason?: string;
  group_id?: number;
}): Promise<User> {
  const { id, ...requestParam } = param;
  const resp = await fetchApi({
    pathOrUrl: `/users/${id}`,
    method: 'post',
    data: requestParam,
  });
  const user = resp.data as User;
  formatUserField(user);
  return user;
}

export function changePassword(param: { old_password: string; new_password: string }) {
  return fetchApi({
    pathOrUrl: '/users/changePassword',
    method: 'post',
    data: param,
  });
}

export async function countUser(param?: {
  user_id?: number;
  username?: string;
  nickname?: string;
  group_id?: number;
  status?: UserStatus;
}): Promise<number> {
  const resp = await fetchApi({
    pathOrUrl: '/users/list',
    method: 'get',
    data: {
      ...param,
      page_offset: 0,
      page_limit: 0,
    },
  });
  return resp.extra.totalCount;
}

export async function listUser(param: {
  user_id?: number;
  username?: string;
  nickname?: string;
  nickname_like?: string;
  group_id?: Array<number | string>;
  status?: UserStatus[];
  page_offset: number;
  page_limit: number;
}): Promise<User[]> {
  const resp = await fetchApi({
    pathOrUrl: '/users/list',
    method: 'get',
    data: {
      ...param,
      group_id: param.group_id?.join(','),
      status: param.status?.join(','),
    },
  });
  const data: User[] = resp.data || [];
  data.forEach((user) => formatUserField(user));
  return data;
}

export function sendBindEmailVerifyCode(param: { email: string }) {
  return fetchApi({
    pathOrUrl: '/users/sendBindEmailVerifyCode',
    method: 'post',
    data: param,
  });
}

export function sendRemoveBindEmailVerifyCode() {
  return fetchApi({
    pathOrUrl: '/users/sendUnBindEmailVerifyCode',
    method: 'post',
  });
}

export function removeBindEmail(param: { verify_code: string }) {
  return fetchApi({
    pathOrUrl: '/users/removeBindEmail',
    method: 'post',
    data: param,
  });
}

export function bindEmail(param: { email: string; verify_code: string }) {
  return fetchApi({
    pathOrUrl: '/users/bindEmail',
    method: 'post',
    data: param,
  });
}

export function getMyEmail(): Promise<string> {
  return fetchApi('/users/getMyEmail').then((resp) => resp.data);
}

export function enableMsgToEmail(enable: boolean): Promise<void> {
  return fetchApi({
    pathOrUrl: '/users/enableMsgToEmail',
    method: 'post',
    data: { enable },
  }).then(() => {});
}
