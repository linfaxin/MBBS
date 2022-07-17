import { Model, Sequelize, DataTypes } from 'sequelize';
import { createModelCache } from '../utils/model-cache';

/**
 * 分组内的用户
 */
export class GroupUser extends Model<Partial<GroupUser>> {
  /** 分组 id */
  group_id: number;
  /** 用户 id */
  user_id: number;
}

const GroupUserCache = createModelCache(GroupUser, {
  max: 10000,
  getCacheKey: (m) => m.user_id,
});

/** 获取指定用户的 groupId */
export async function getUserGroupId(db: Sequelize, userId: number): Promise<number> {
  return (
    GroupUserCache.getInCache(db, userId)?.group_id ||
    (await (await getGroupUserModel(db)).findOne({ where: { user_id: userId } }))?.group_id
  );
}

/** 获取 groupId 下所有用户Id */
export async function getGroupUserIds(db: Sequelize, groupId: number): Promise<number[]> {
  const GroupUserModel = await getGroupUserModel(db);
  const groupUsers = await GroupUserModel.findAll({ where: { group_id: groupId } });
  return groupUsers?.map((m) => m.user_id);
}

/** 设置指定用户的 groupId */
export async function setUserGroupId(db: Sequelize, userId: number, groupId: number): Promise<void> {
  const groupUser = GroupUserCache.getInCache(db, userId) || (await (await getGroupUserModel(db)).findOne({ where: { user_id: userId } }));
  if (groupUser) {
    groupUser.group_id = groupId;
    await groupUser.save();
  } else {
    await (await getGroupUserModel(db)).create({ user_id: userId, group_id: groupId });
  }
}

const waitDBSync = new WeakMap<Sequelize, Promise<any>>();
export async function getGroupUserModel(db: Sequelize): Promise<typeof GroupUser> {
  if (waitDBSync.has(db)) {
    await waitDBSync.get(db);
  }
  if (db.models && db.models.GroupUser) {
    return db.models.GroupUser as typeof GroupUser;
  }
  class DBGroupUser extends GroupUser {}
  DBGroupUser.init(
    {
      group_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize: db,
      modelName: 'GroupUser',
      tableName: 'group_user',
      createdAt: false,
      updatedAt: false,
      indexes: [{ fields: ['group_id'] }, { fields: ['user_id'] }],
    },
  );

  waitDBSync.set(db, DBGroupUser.sync({ alter: { drop: false } }));
  await waitDBSync.get(db);
  waitDBSync.delete(db);
  return DBGroupUser;
}
