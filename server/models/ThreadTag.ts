import { Model, Sequelize, DataTypes, Op } from 'sequelize';
import { createModelCache } from '../utils/model-cache';
import { GROUP_ID_ADMIN } from '../routes/bbs/const';
import { getThreadModel } from './Thread';

export const THREAD_TAG_ID_STICKY = 1;
export const THREAD_TAG_ID_ESSENCE = 2;
export const THREAD_TAG_ID_READONLY = 98;
export const THREAD_TAG_ID_DELETED = 99; // ID值最大的系统预置标签（1-99），预置标签 不允许手动管理（系统自动设置在帖子上）

/**
 * 帖子标签模型
 */
export class ThreadTag extends Model<Partial<ThreadTag>> {
  /** 标签 id */
  id: number;
  /** 标签名称 */
  name: string;
  /** 标签说明 */
  description?: string;
  /** 标签图标 */
  icon?: string;
  /** 是否在 帖子列表/详情 隐藏显示(帖子详情-标签管理弹窗内仍会显示) */
  hidden_in_thread_view: boolean;
  /** 限制在指定板块内使用，格式：1,3,4 （逗号分隔的板块ID） */
  limit_use_in_categories: string;
  /** 限制指定的用户角色可以设置标签到帖子，格式：1,10,11 （逗号分隔的角色ID，-1代表帖子作者） */
  limit_use_by_groups: string;
  /** 额外限制可阅读该标签帖子的角色，格式：-1,10,11,7 （逗号分隔的角色ID，-1代表帖子作者） */
  limit_thread_read_groups: string;
  /** 额外限制可修改该标签帖子的角色，格式：-1,10,11 （逗号分隔的角色ID，-1代表帖子作者） */
  limit_thread_write_groups: string;
  /** 创建时间 */
  created_at: Date;
  /** 更新时间 */
  updated_at: Date;
  /** 是否能被角色在指定板块使用该标签 */
  canUseByGroupAndCategory(userGroupID: number, categoryId: number, isUserThreadOwner: boolean): boolean {
    if (this.id < 100) {
      // 系统预置标签(ID<100)不允许手动添加
      return false;
    }
    if (userGroupID === GROUP_ID_ADMIN) {
      return this.canUseInCategory(categoryId);
    }
    const allowGroupIds = (this.limit_use_by_groups || '').split(',').filter(Boolean);
    if (!allowGroupIds.length) {
      // 未限制角色，仅帖子作者可使用该标签
      return isUserThreadOwner;
    }
    if (allowGroupIds.includes(String(userGroupID))) {
      // 是指定的角色
      return true;
    }
    if (isUserThreadOwner && allowGroupIds.includes('-1')) {
      // 是帖子作者
      return true;
    }

    // 无使用权限
    return false;
  }
  canUseInCategory(categoryId: number): boolean {
    if (!this.limit_use_in_categories) {
      // 未指定限制使用的板块，全局可用
      return true;
    }
    return this.limit_use_in_categories.split(',').includes(String(categoryId));
  }
  /** 是否能被指定角色ID阅读标签帖子 */
  canReadThreadBy(groupId: number, isUserThreadOwner: boolean): boolean {
    if (groupId === GROUP_ID_ADMIN) {
      return true;
    }
    const allowGroupIds = (this.limit_thread_read_groups || '').split(',').filter(Boolean);
    if (!allowGroupIds.length) {
      // 未限制阅读角色，所有人可读
      return true;
    }
    if (allowGroupIds.includes(String(groupId))) {
      // 是指定的角色
      return true;
    }
    if (isUserThreadOwner && allowGroupIds.includes('-1')) {
      // 是帖子作者
      return true;
    }

    // 无阅读帖子权限
    return false;
  }
  /** 是否能被指定角色ID修改标签帖子 */
  canWriteThreadBy(groupId: number, defaultHasPermission: boolean, isUserThreadOwner: boolean): boolean {
    if (groupId === GROUP_ID_ADMIN) {
      return true;
    }
    const allowGroupIds = (this.limit_thread_write_groups || '').split(',').filter(Boolean);
    if (!allowGroupIds.length) {
      // 未限制角色，返回 默认的修改帖子权限
      return defaultHasPermission;
    }
    if (allowGroupIds.includes(String(groupId))) {
      // 是指定的角色
      return true;
    }
    if (isUserThreadOwner && allowGroupIds.includes('-1')) {
      // 是帖子作者
      return true;
    }

    // 无修改帖子权限
    return false;
  }
}

const ThreadTagCache = createModelCache(ThreadTag, {
  max: 100,
  getCacheKey: (m) => m.id,
});

export async function getThreadTagById(db: Sequelize, tagId: number): Promise<ThreadTag> {
  return ThreadTagCache.getInCache(db, tagId) || (await getThreadTagModel(db)).findByPk(tagId);
}

export async function getThreadTagByName(db: Sequelize, name: string): Promise<ThreadTag> {
  return ThreadTagCache.getAllCachedValue(db).find((m) => m.name === name) || (await getThreadTagModel(db)).findOne({ where: { name } });
}

// 删除（软删）
export async function removeThreadTag(db: Sequelize, tagId: number): Promise<boolean> {
  const ThreadTagModel = await getThreadTagModel(db);
  const threadTag = await ThreadTagModel.findOne({ where: { id: tagId } });
  if (threadTag) {
    await db.transaction(async (t) => {
      threadTag.name = `[已删除-${threadTag.id}]${threadTag.name}`;
      await threadTag.save({ transaction: t });
      await threadTag.destroy({ transaction: t });
    });
  }
  return !!threadTag;
}

const waitDBSync = new WeakMap<Sequelize, Promise<any>>();
export async function getThreadTagModel(db: Sequelize): Promise<typeof ThreadTag> {
  if (waitDBSync.has(db)) {
    await waitDBSync.get(db);
  }
  if (db.models && db.models.ThreadTag) {
    return db.models.ThreadTag as typeof ThreadTag;
  }
  class DBThreadTag extends ThreadTag {}
  DBThreadTag.init(
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
      },
      description: {
        type: DataTypes.TEXT,
      },
      icon: {
        type: DataTypes.TEXT,
      },
      hidden_in_thread_view: {
        type: DataTypes.BOOLEAN,
      },
      limit_use_in_categories: {
        type: DataTypes.TEXT,
      },
      limit_use_by_groups: {
        type: DataTypes.TEXT,
      },
      limit_thread_read_groups: {
        type: DataTypes.TEXT,
      },
      limit_thread_write_groups: {
        type: DataTypes.TEXT,
      },
      created_at: {
        type: DataTypes.DATE,
      },
      updated_at: {
        type: DataTypes.DATE,
      },
    },
    {
      sequelize: db,
      modelName: 'ThreadTag',
      tableName: 'thread_tag',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      paranoid: true,
      indexes: [{ fields: ['name'] }],
    },
  );

  waitDBSync.set(
    db,
    DBThreadTag.sync({ alter: { drop: false } }).then(async () => {
      // 初始化 系统预置标签（不可手动绑定/移除，仅随系统行为自动绑定）
      if (!(await DBThreadTag.findOne({ where: { id: THREAD_TAG_ID_STICKY } }))) {
        await DBThreadTag.create({
          id: THREAD_TAG_ID_STICKY,
          name: '顶',
          description: '置顶帖子',
        });
        // 所有已置顶帖子补齐标签
        const ThreadModel = await getThreadModel(db);
        const allThreads = await ThreadModel.findAll({ where: { is_sticky: true } });
        for (const thread of allThreads) {
          await thread.addTag(THREAD_TAG_ID_STICKY);
        }
      }
      if (!(await DBThreadTag.findOne({ where: { id: THREAD_TAG_ID_ESSENCE } }))) {
        await DBThreadTag.create({
          id: THREAD_TAG_ID_ESSENCE,
          name: '精',
          description: '精华帖子',
        });
        // 所有已设置精华帖子补齐标签
        const ThreadModel = await getThreadModel(db);
        const allThreads = await ThreadModel.findAll({ where: { is_essence: true } });
        for (const thread of allThreads) {
          await thread.addTag(THREAD_TAG_ID_ESSENCE);
        }
      }
      if (!(await DBThreadTag.findOne({ where: { id: THREAD_TAG_ID_READONLY } }))) {
        await DBThreadTag.create({
          id: THREAD_TAG_ID_READONLY,
          name: '只读',
          description: '帖子不允许修改',
          limit_thread_write_groups: String(GROUP_ID_ADMIN),
        });
      }
      if (!(await DBThreadTag.findOne({ where: { id: THREAD_TAG_ID_DELETED } }))) {
        await DBThreadTag.create({
          id: THREAD_TAG_ID_DELETED,
          name: '已删除',
          description: '帖子已删除',
          limit_thread_read_groups: String(GROUP_ID_ADMIN),
          limit_thread_write_groups: String(GROUP_ID_ADMIN),
        });
        // 所有已删除帖子补齐标签
        const ThreadModel = await getThreadModel(db);
        const allThreads = await ThreadModel.findAll({ where: { deleted_at: { [Op.not]: null } } });
        for (const thread of allThreads) {
          await thread.addTag(THREAD_TAG_ID_DELETED);
        }
      }
    }),
  );
  await waitDBSync.get(db);
  waitDBSync.delete(db);
  return DBThreadTag;
}
