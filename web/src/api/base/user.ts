import dayjs from 'dayjs';
import { Group } from '@/api/group';
import { settingApi } from '..';

const LocalStorageUserKey = 'MBBS_USER_INFO';

/** 用户状态 */
export enum UserStatus {
  /** 正常 */
  Normal = 0,
  /** 禁用 */
  Disabled = 1,
  /** 审核中 */
  Checking = 2,
  /** 审核拒绝 */
  CheckFail = 3,
  /** 审核忽略 */
  CheckIgnore = 4,
}

// 用户模型
export interface User {
  /** 用户id */
  id: number;
  /** 用户账号 */
  username: string;
  /** 密码 hash */
  password: string;
  /** 昵称 */
  nickname: string;
  /** 手机号 */
  mobile: string;
  /** 绑定的邮箱（接口返回 bool 型，代表是否已绑定） */
  email?: boolean;
  /** 论坛新消息发送至邮箱开关 */
  msg_to_email_enable?: boolean;
  /** 个人签名 */
  signature: string;
  /** 上次登录 ip */
  last_login_ip: string;
  /** 注册 ip */
  register_ip: string;
  /** 注册原因 */
  register_reason: string;
  /** 注册拒绝原因 */
  reject_reason: string;
  /** 注册邀请码 */
  register_invitation_code: string;
  /** 发帖数 */
  thread_count: number;
  /** 评论数 */
  post_count: number;
  /** 关注了多少人 */
  follow_count: number;
  /** 被关注了多少人（粉丝数） */
  fans_count: number;
  /** 喜欢（点赞）数量  */
  liked_count: number;
  /** 用户状态：0 正常 1 禁用 2 审核中 3 审核拒绝 4 审核忽略 */
  status: UserStatus;
  /** 头像地址  */
  avatar: string;
  /** 头像修改时间  */
  avatar_at: Date;
  /** 上次登录时间 */
  login_at: Date;
  /** 付费加入时间 */
  joined_at: Date;
  /** 付费到期时间 */
  expired_at: Date;
  /** 创建时间 */
  created_at: Date;
  /** 更新时间 */
  updated_at: Date;
  /** 登录凭证 */
  token?: string;
  /** 用户角色 */
  group?: Group;
}

let loginUserCache: User | null;

export function formatUserField(user: User) {
  if (user.avatar_at) {
    user.avatar_at = dayjs(user.avatar_at).toDate();
  }
  if (user.login_at) {
    user.login_at = dayjs(user.login_at).toDate();
  }
  if (user.joined_at) {
    user.joined_at = dayjs(user.joined_at).toDate();
  }
  if (user.expired_at) {
    user.expired_at = dayjs(user.expired_at).toDate();
  }
  if (user.created_at) {
    user.created_at = dayjs(user.created_at).toDate();
  }
  if (user.updated_at) {
    user.updated_at = dayjs(user.updated_at).toDate();
  }
}

export function getLoginUser(): User | null {
  if (loginUserCache) {
    return loginUserCache;
  }
  const userStr = localStorage.getItem(LocalStorageUserKey) || sessionStorage.getItem(LocalStorageUserKey);
  if (!userStr) return null;
  const user = JSON.parse(userStr);
  formatUserField(user);
  loginUserCache = user;
  return user as User;
}

const userChangeCallbacks = new Set<(user: User | null) => void>();

export function setLoginUser(user: User | null) {
  if (user && user.id === loginUserCache?.id && !user.token) {
    user.token = loginUserCache?.token; // 更新用户信息时，保留 token
  }
  loginUserCache = user;
  if (!user) {
    localStorage.removeItem(LocalStorageUserKey);
    sessionStorage.removeItem(LocalStorageUserKey);
  } else {
    settingApi.getAll().then((setting) => {
      if (setting.site_remember_login_days === '0') {
        localStorage.removeItem(LocalStorageUserKey);
        sessionStorage.setItem(LocalStorageUserKey, JSON.stringify(user));
      } else {
        localStorage.setItem(LocalStorageUserKey, JSON.stringify(user));
        sessionStorage.removeItem(LocalStorageUserKey);
      }
    });
  }
  userChangeCallbacks.forEach((c) => c(user));
}

export function onLoginUserChange(callback: (user: User | null) => void): () => void {
  userChangeCallbacks.add(callback);
  return () => userChangeCallbacks.delete(callback);
}
