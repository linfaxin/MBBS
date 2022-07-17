import { DataTypes, Model, Sequelize } from 'sequelize';
import { createModelCache } from '../utils/model-cache';

/**
 * 用户分组模型
 */
export class Group extends Model<Partial<Group>> {
  id: number;
  /** 分组名称 */
  name: string;
  /** 是否为用户注册时的默认分组 */
  default: boolean;
  /** 创建时间 */
  created_at: Date;
  /** 更新时间 */
  updated_at: Date;
}
const GroupCache = createModelCache(Group, {
  max: 100,
  getCacheKey: (m) => m.id,
});

export async function getGroupById(db: Sequelize, groupId: number): Promise<Group> {
  return GroupCache.getInCache(db, groupId) || (await getGroupModel(db)).findByPk(groupId);
}

export async function getGroupByName(db: Sequelize, name: string): Promise<Group> {
  return GroupCache.getAllCachedValue(db).find((g) => g.name === name) || (await getGroupModel(db)).findOne({ where: { name } });
}

export async function getDefaultGroup(db: Sequelize): Promise<Group> {
  return GroupCache.getAllCachedValue(db).find((g) => g.default) || (await getGroupModel(db)).findOne({ where: { default: true } });
}

export async function createGroup(db: Sequelize, name: string): Promise<Group> {
  const GroupModel = await getGroupModel(db);
  return GroupModel.create({ name });
}

// 删除分组（软删）
export async function removeGroup(db: Sequelize, groupId: number): Promise<boolean> {
  const GroupModel = await getGroupModel(db);
  const group = await GroupModel.findOne({ where: { id: groupId } });
  if (group) {
    await db.transaction(async (t) => {
      group.name = `[已删除-${group.id}]${group.name}`;
      await group.save({ transaction: t });
      await group.destroy({ transaction: t });
    });
  }
  return !!group;
}

export async function setGroupName(db: Sequelize, groupId: number, groupName: string): Promise<boolean> {
  const GroupModel = await getGroupModel(db);
  const [count] = await GroupModel.update({ name: groupName }, { where: { id: groupId } });
  return count > 0;
}

export async function listGroup(db: Sequelize): Promise<Group[]> {
  const GroupModel = await getGroupModel(db);
  return GroupModel.findAll();
}

const waitDBSync = new WeakMap<Sequelize, Promise<any>>();
export async function getGroupModel(db: Sequelize): Promise<typeof Group> {
  if (waitDBSync.has(db)) {
    await waitDBSync.get(db);
  }
  if (db.models && db.models.Group) {
    return db.models.Group as typeof Group;
  }
  class DBGroup extends Group {}
  DBGroup.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        unique: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.TEXT,
        allowNull: false,
        unique: true,
      },
      default: {
        type: DataTypes.BOOLEAN,
      },
    },
    {
      sequelize: db,
      modelName: 'Group',
      tableName: 'groups',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
      paranoid: true,
      indexes: [{ fields: ['name'] }, { fields: ['default'] }],
    },
  );

  waitDBSync.set(db, DBGroup.sync({ alter: { drop: false } }));
  await waitDBSync.get(db);
  waitDBSync.delete(db);
  return DBGroup;
}
