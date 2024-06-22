import fetchApi from '@/api/base/fetch';

export declare type CategoryPermissionType =
  | 'viewThreads' // 浏览帖子
  | 'createThread' // 创建帖子
  | 'thread.createHiddenContent' // 创建内容回复可见的帖子
  | 'thread.edit' // 编辑所有帖子
  | 'thread.editOwnThread' // 编辑自己发布的帖子
  | 'thread.editOwnPost' // 编辑自己发布的评论/回复
  | 'thread.editPosts' // 编辑所有帖子评论/回复
  | 'thread.essence' // 帖子加精
  | 'thread.favorite' // 帖子收藏（收藏功能未开发）
  | 'thread.hide' // 删除所有帖子
  | 'thread.hideOwnThread' // 删除自己发布的帖子
  | 'thread.hideOwnPost' // 删除自己发布的评论/回复
  | 'thread.hideOwnThreadAllPost' // 删除自己发布帖子的他人评论
  | 'thread.stickyOwnThreadPost' // 置顶自己帖子下的评论
  | 'thread.hidePosts' // 删除所有评论/回复
  | 'thread.disableThreadPosts' // 禁用帖子评论功能
  | 'thread.likePosts' // 评论点赞
  | 'thread.like' // 帖子点赞
  | 'thread.reply' // 帖子评论
  | 'thread.sticky' // 帖子置顶
  | 'thread.viewPosts' // 浏览帖子评论
  | 'thread.ignoreCreateValidate'; // 发帖免审核

export declare type GlobalPermissionType =
  | 'attachment.create.0' // 全局上传附件
  | 'attachment.create.1' // 全局上传图片
  | 'user.edit.status' // 全局用户状态修改权限
  | 'user.edit.group' // 全局修改用户所属分组
  | 'user.edit.base' // 全局修改用户基本信息
  | 'user.view' // 全局用户信息查看权限
  | 'user.view.threads' // 查看指定用户的所有帖子
  | 'user.view.posts' // 查看指定用户的所有评论
  | 'user.search'; // 全局搜索用户

export declare type PermissionType =
  | GlobalPermissionType // 全局通用权限
  | CategoryPermissionType // 全局读写帖子权限
  | `category${number}.${CategoryPermissionType}`; // 在指定分类下 读写帖子权限

let getMyPermissionsCache: null | Promise<PermissionType[]>;

export function getMyPermissions(): Promise<PermissionType[]> {
  if (!getMyPermissionsCache) {
    getMyPermissionsCache = fetchApi('permissions/getMyPermissions')
      .then((resp) => resp.data)
      .catch((e) => {
        getMyPermissionsCache = null;
        throw e;
      });
  }
  return getMyPermissionsCache;
}

export function getPermissions(group_id: number | string): Promise<PermissionType[]> {
  return fetchApi({
    pathOrUrl: 'permissions/getPermissions',
    method: 'get',
    data: { group_id },
  }).then((resp) => resp.data);
}

export function setPermissions(group_id: number | string, permissions: PermissionType[]): Promise<void> {
  return fetchApi({
    pathOrUrl: 'permissions/setPermissions',
    method: 'post',
    data: { group_id, permissions },
  }).then((resp) => {});
}
