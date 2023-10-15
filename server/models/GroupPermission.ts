import { Model, Sequelize, DataTypes } from 'sequelize';
import { createModelCache } from '../utils/model-cache';
import { GROUP_ID_TOURIST } from '../routes/bbs/const';

declare type CategoryPermissionType =
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
  | 'thread.stickyOwnThreadPost' // 置顶自己帖子的评论
  | 'thread.hidePosts' // 删除所有评论/回复
  | 'thread.likePosts' // 评论点赞
  | 'thread.like' // 帖子点赞
  | 'thread.reply' // 帖子评论
  | 'thread.sticky' // 帖子置顶
  | 'thread.viewPosts'; // 浏览帖子评论

declare type GlobalPermissionType =
  | 'attachment.create.0' // 全局上传附件/视频
  | 'attachment.create.1' // 全局上传图片
  | 'user.edit.status' // 全局用户状态修改权限
  | 'user.edit.group' // 全局修改用户所属分组
  | 'user.edit.base' // 全局修改用户基本信息
  | 'user.view' // 全局用户信息查看权限
  | 'user.view.threads' // 查看指定用户的所有帖子
  | 'user.view.posts'; // 查看指定用户的所有评论

export declare type PermissionType =
  | GlobalPermissionType // 全局通用权限
  | CategoryPermissionType // 全局读写帖子权限
  | `category${number}.${CategoryPermissionType}`; // 在指定分类下 读写帖子权限

/** 全部全局权限 */
export const AllGlobalPermissions: PermissionType[] = [
  'viewThreads',
  'createThread',
  'thread.createHiddenContent',
  'thread.edit',
  'thread.editOwnThread',
  'thread.editOwnPost',
  'thread.editPosts',
  'thread.essence',
  'thread.favorite',
  'thread.hide',
  'thread.hideOwnThread',
  'thread.hideOwnPost',
  'thread.hideOwnThreadAllPost',
  'thread.stickyOwnThreadPost',
  'thread.hidePosts',
  'thread.likePosts',
  'thread.like',
  'thread.reply',
  'thread.sticky',
  'thread.viewPosts',
  'attachment.create.0',
  'attachment.create.1',
  'user.edit.status',
  'user.edit.group',
  'user.edit.base',
  'user.view',
];

export const DefaultNormalUserPermissions: PermissionType[] = [
  'user.view',
  'user.view.threads',
  'user.view.posts',
  'viewThreads',
  'createThread',
  'thread.createHiddenContent',
  'thread.viewPosts',
  'thread.reply',
  'thread.like',
  'thread.likePosts',
  'thread.editOwnThread',
  'thread.editOwnPost',
  'thread.hideOwnThread',
  'thread.stickyOwnThreadPost',
  'thread.hideOwnPost',
  'attachment.create.0',
  'attachment.create.1',
];

export const DefaultTouristUserPermissions: PermissionType[] = ['user.view', 'viewThreads', 'thread.viewPosts'];

/**
 * 分组拥有的权限
 */
export class GroupPermission extends Model<Partial<GroupPermission>> {
  /** 分组 id */
  group_id: number;
  /** 权限名称 */
  permission: PermissionType;
}
const GroupPermissionCache = createModelCache<GroupPermission, PermissionType[]>(GroupPermission, {
  max: 1000,
  maxAge: 1000 * 60 * 30,
  getCacheKey: (m) => m.group_id,
  getCacheValue: () => null as PermissionType[],
});

export async function hasPermission(db: Sequelize, groupId: number, permission: PermissionType): Promise<boolean> {
  const permissions = await getGroupPermissions(db, groupId);
  return permissions.includes(permission);
}

export async function hasOneOfPermissions(db: Sequelize, groupId: number, ...checkPermissions: PermissionType[]): Promise<boolean> {
  const permissions = await getGroupPermissions(db, groupId);
  for (const checkP of checkPermissions) {
    if (permissions.includes(checkP)) return true;
  }
  return false;
}

/** 获取 groupId 的所有权限 */
export async function getGroupPermissions(db: Sequelize, groupId: number): Promise<PermissionType[]> {
  if (groupId == null) {
    groupId = GROUP_ID_TOURIST;
  }
  const cachedValue = GroupPermissionCache.getInCache(db, groupId);
  if (cachedValue) {
    return cachedValue;
  }
  const GroupPermissionModel = await getGroupPermissionModel(db);
  const permissions = ((await GroupPermissionModel.findAll({ where: { group_id: groupId } })) || []).map((p) => p.permission);
  GroupPermissionCache.setInCache(db, groupId, permissions);
  return permissions;
}

/** 设置 groupId 权限 */
export async function setGroupPermissions(db: Sequelize, groupId: number, permissions: PermissionType[]): Promise<void> {
  if (groupId == null) {
    groupId = GROUP_ID_TOURIST;
  }
  const GroupPermissionModel = await getGroupPermissionModel(db);
  await GroupPermissionModel.destroy({ where: { group_id: groupId } });
  await GroupPermissionModel.bulkCreate(permissions.filter(Boolean).map((permission) => ({ group_id: groupId, permission })));
}

/** 为 groupId 添加权限 */
export async function addGroupPermission(db: Sequelize, groupId: number, permission: PermissionType): Promise<void> {
  if (groupId == null) {
    groupId = GROUP_ID_TOURIST;
  }
  const GroupPermissionModel = await getGroupPermissionModel(db);
  if (await GroupPermissionModel.findOne({ where: { group_id: groupId, permission } })) {
    // 已有权限
    return;
  }
  // 添加权限
  await GroupPermissionModel.create({
    group_id: groupId,
    permission,
  });
}

/** 为 groupId 删除权限 */
export async function removeGroupPermission(db: Sequelize, groupId: number, permission: PermissionType): Promise<boolean> {
  if (groupId == null) {
    groupId = GROUP_ID_TOURIST;
  }
  const GroupPermissionModel = await getGroupPermissionModel(db);
  const removeCount = await GroupPermissionModel.destroy({ where: { group_id: groupId, permission } });
  return removeCount > 0;
}

const waitDBSync = new WeakMap<Sequelize, Promise<any>>();
export async function getGroupPermissionModel(db: Sequelize): Promise<typeof GroupPermission> {
  if (waitDBSync.has(db)) {
    await waitDBSync.get(db);
  }
  if (db.models && db.models.GroupPermission) {
    return db.models.GroupPermission as typeof GroupPermission;
  }
  class DBGroupPermission extends GroupPermission {}
  DBGroupPermission.init(
    {
      group_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      permission: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    },
    {
      sequelize: db,
      modelName: 'GroupPermission',
      tableName: 'group_permission',
      createdAt: false,
      updatedAt: false,
      indexes: [{ fields: ['group_id'] }],
    },
  );

  waitDBSync.set(db, DBGroupPermission.sync({ alter: { drop: false } }));
  await waitDBSync.get(db);
  waitDBSync.delete(db);
  return DBGroupPermission;
}
