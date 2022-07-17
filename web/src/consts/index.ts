/** 上传图片的默认压缩分辨率 */
import { UserStatus } from '@/api/base/user';

export const DEFAULT_ATTACHMENT_IMAGE_COMPRESS_SIZE = 1280;

/** 上传图片压缩分辨率的选择条目 */
export const ENUM_MAP_ATTACHMENT_IMAGE_COMPRESS_SIZE: Record<number | string, string> = {
  360: '低(360)',
  720: '中(720)',
  1280: '高(1280)',
  1920: '极高(1920)',
};

/** 附件/图片 加载速度（单位：B） */
export const DEFAULT_ATTACHMENT_LOAD_RATE = 64 * 1024;

/** 用户状态文案 */
export const ENUM_MAP_USER_STATE: Record<UserStatus, string> = {
  [UserStatus.Normal]: '正常',
  [UserStatus.Disabled]: '禁用',
  [UserStatus.Checking]: '审核中',
  [UserStatus.CheckFail]: '审核拒绝',
  [UserStatus.CheckIgnore]: '审核拒绝',
};

/** 用户状态流转基 */
export const UserStatusCanChangeToMap: Record<UserStatus, UserStatus[]> = {
  [UserStatus.Normal]: [UserStatus.Normal, UserStatus.Disabled],
  [UserStatus.Disabled]: [UserStatus.Disabled, UserStatus.Normal],
  [UserStatus.Checking]: [UserStatus.Checking, UserStatus.Normal, UserStatus.CheckFail],
  [UserStatus.CheckFail]: [UserStatus.CheckFail, UserStatus.Normal],
  [UserStatus.CheckIgnore]: [UserStatus.CheckIgnore, UserStatus.Normal],
};

export const DEFAULT_POWER_BY_MARKDOWN = '由 [mbbs.cc](http://mbbs.cc) 提供论坛服务';

/** 游客分组ID值，用于设置游客的权限 */
export const GROUP_ID_TOURIST = 7;
