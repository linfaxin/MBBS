import { DataTypes, Model, Op, Sequelize, SaveOptions, WhereOptions } from 'sequelize';
import { createModelCache } from '../utils/model-cache';
import { getUser, User } from './User';
import { getPost, getPostModel, Post } from './Post';
import { hasUserLikedPost } from './LikePostUser';
import { updateCategoryThreadCount } from './Category';
import { getGroupPermissions, hasOneOfPermissions } from './GroupPermission';
import { GROUP_ID_TOURIST } from '../routes/bbs/const';
import { filterMarkdownHiddenContent, markdownHasReplyHiddenContent, markdownToPureText } from '../utils/md-to-pure-text';
import { parseInt } from 'lodash';
import { getThreadTagById, THREAD_TAG_ID_DELETED } from './ThreadTag';

import moment = require('moment');

export enum ThreadIsApproved {
  /** 审核中 */
  checking = 0,
  /** 审核通过 */
  ok = 1,
  /** 审核失败 */
  check_failed = 2,
}

/**
 * 帖子模型
 */
export class Thread extends Model<Partial<Thread>> {
  /** 帖子 ID */
  id: number;
  /** 帖子作者 */
  user_id: number;
  /** 最后回复的用户id */
  last_posted_user_id: number;
  /** 分类id */
  category_id: number;
  /** 帖子内容 ID */
  first_post_id: number;
  /** 类型（预留） */
  type: 1;
  /** 是否审核通过 */
  is_approved: ThreadIsApproved;
  /** 是否在所属板块置顶 */
  is_sticky: boolean;
  /** 是否同时在其他板块置顶，值格式：1,3(逗号分隔的板块 ID) */
  sticky_at_other_categories: string;
  /** 是否精华 */
  is_essence: boolean;
  /** 是否是草稿箱帖子 */
  is_draft: boolean;
  /** 是否关闭帖子的评论功能 */
  disable_post: boolean;
  /** 帖子名称 */
  title: string;
  /** 帖子内容（纯文本，用于索引） */
  content_for_indexes: string;
  /** 帖子回复数量（默认第一条回复为帖子本身的内容，所以数量至少为1） */
  post_count: number;
  /** 阅读数 */
  view_count: number;
  /** 帖子标签ID，格式：^1^3^ (^分隔+首尾^ 的标签ID) */
  thread_tag_ids?: string;
  /** 删除的用户id */
  deleted_user_id: number;
  /** 最后回复时间 */
  posted_at: Date;
  /** 创建时间 */
  created_at: Date;
  /** 更新时间 */
  updated_at: Date;
  /** 内容/标题修改时间 */
  modified_at: Date;
  /** 删除时间 */
  deleted_at: Date;
  /** 是否能被指定用户流量 */
  async canViewByUser(currentUser: User | null): Promise<boolean> {
    if (await currentUser?.isAdmin()) return true;
    let hasPermission;
    if (currentUser) {
      // 已登录用户
      hasPermission =
        (await currentUser.hasPermission('viewThreads')) || (await currentUser.hasPermission(`category${this.category_id}.viewThreads`));
    } else {
      // 游客
      const permissions = await getGroupPermissions(this.sequelize, GROUP_ID_TOURIST);
      hasPermission = permissions.includes('viewThreads') || permissions.includes(`category${this.category_id}.viewThreads`);
    }

    if (hasPermission && this.thread_tag_ids) {
      // 再检查标签权限限制
      const currentUserGroupId = (await currentUser?.getGroupId()) || GROUP_ID_TOURIST;
      for (const tagId of this.thread_tag_ids
        .split('^')
        .filter(Boolean)
        .map((id) => parseInt(id))) {
        const threadTag = await getThreadTagById(this.sequelize, tagId);
        if (!threadTag) continue;
        if (!threadTag.canReadThreadBy(currentUserGroupId, this.user_id === currentUser?.id)) {
          return false;
        }
      }
    }

    return hasPermission;
  }
  /** 是否能被指定用户修改 */
  async canEditByUser(currentUser: User): Promise<boolean> {
    if (!currentUser) return false;
    if (await currentUser.isAdmin()) return true;
    if (this.user_id === currentUser.id && this.is_draft) {
      return true;
    }
    let hasPermission = false;
    if (this.user_id === currentUser.id) {
      // 修改自己的帖子
      hasPermission = await currentUser.hasOneOfPermissions('thread.editOwnThread', `category${this.category_id}.thread.editOwnThread`);
    }
    if (!hasPermission) {
      // 管理员权限
      hasPermission = await currentUser.hasOneOfPermissions('thread.edit', `category${this.category_id}.thread.edit`);
    }

    if (hasPermission && this.thread_tag_ids) {
      // 再检查标签权限限制
      const currentUserGroupId = (await currentUser?.getGroupId()) || GROUP_ID_TOURIST;
      for (const tagId of this.thread_tag_ids
        .split('^')
        .filter(Boolean)
        .map((id) => parseInt(id))) {
        const threadTag = await getThreadTagById(this.sequelize, tagId);
        if (!threadTag) continue;
        if (!threadTag.canWriteThreadBy(currentUserGroupId, this.user_id === currentUser?.id)) {
          return false;
        }
      }
    }
    return hasPermission;
  }
  /** 是否能被指定用户软删除 */
  async canHideByUser(currentUser: User): Promise<boolean> {
    if (await currentUser.isAdmin()) return true;
    if (!currentUser) return false;
    let hasPermission = false;
    if (this.user_id === currentUser.id) {
      // 软删自己的帖子
      hasPermission = await currentUser.hasOneOfPermissions('thread.hideOwnThread', `category${this.category_id}.thread.hideOwnThread`);
    }
    if (!hasPermission) {
      // 管理员权限
      hasPermission = await currentUser.hasOneOfPermissions('thread.hide', `category${this.category_id}.thread.hide`);
    }
    return hasPermission;
  }
  async getContent() {
    const firstPost = await getPost(this.sequelize, this.first_post_id, { paranoid: false });
    return firstPost?.content;
  }
  async toViewJSON(viewUser: User, options?: { field_is_liked?: boolean }) {
    const { field_is_liked = true } = options || {};

    let firstPost: Post;
    if (!this.first_post_id) {
      // 兼容老数据，补齐丢失的 first_post_id
      const PostModel = await getPostModel(this.sequelize);
      firstPost = await PostModel.findOne({ where: { is_first: true, thread_id: this.id } });
      this.first_post_id = firstPost.id;
      await this.save();
    } else {
      firstPost = await getPost(this.sequelize, this.first_post_id, { paranoid: false });
    }

    let content = firstPost?.content || '';
    let content_for_indexes = this.content_for_indexes;
    const canEdit = !!viewUser && (await this.canEditByUser(viewUser));

    // 返回的 content 字段隐藏回复可见内容（针对 无编辑权限 & 未回复用户）
    if (markdownHasReplyHiddenContent(content)) {
      const PostModel = await getPostModel(this.sequelize);
      const hasReply = !!viewUser && !!(await PostModel.findOne({ where: { thread_id: this.id, user_id: viewUser.id } }));
      if (!canEdit && !hasReply) {
        content = filterMarkdownHiddenContent(content);
      }
    }

    if (!(await this.canViewByUser(viewUser))) {
      // 对当前用户不可见时，隐藏帖子内容（标题等其他 非内容信息 正常露出）
      content = '';
      content_for_indexes = '';
    }

    return {
      ...this.toJSON(),
      content,
      content_for_indexes,
      user: await (await getUser(this.sequelize, this.user_id)).toViewJSON(),
      like_count: firstPost?.like_count,
      reply_count: firstPost?.reply_count,
      modified_at: this.modified_at || this.created_at, // 老数据无 modified_at 展示兼容
      is_liked: field_is_liked ? !!viewUser && (await hasUserLikedPost(this.sequelize, this.first_post_id, viewUser.id)) : false,
      can_edit: canEdit,
      can_hide: !!viewUser && (await this.canHideByUser(viewUser)),
      can_like: !!viewUser && (await viewUser.hasOneOfPermissions('thread.like', `category${this.category_id}.thread.like`)),
      can_reply: !!viewUser && (await viewUser.hasOneOfPermissions('thread.reply', `category${this.category_id}.thread.reply`)),
      can_essence: !!viewUser && (await viewUser.hasOneOfPermissions('thread.essence', `category${this.category_id}.thread.essence`)),
      can_sticky: !!viewUser && (await viewUser.hasOneOfPermissions('thread.sticky', `category${this.category_id}.thread.sticky`)),
      can_set_disable_post: !!viewUser && (await viewUser.isAdmin()),
      can_view_posts: viewUser
        ? await viewUser.hasOneOfPermissions('thread.viewPosts', `category${this.category_id}.thread.viewPosts`)
        : await hasOneOfPermissions(this.sequelize, GROUP_ID_TOURIST, 'thread.viewPosts', `category${this.category_id}.thread.viewPosts`),
      thread_tags: (
        await Promise.all(
          (this.thread_tag_ids || '')
            .split('^')
            .filter(Boolean)
            .map((id) => getThreadTagById(this.sequelize, parseInt(id))),
        )
      )
        .filter(Boolean)
        .map((tag) => tag.toJSON()),
    };
  }
  async addTag(tagId: number, save = true) {
    const tagIdSet = new Set(
      (this.thread_tag_ids || '')
        .split('^')
        .filter(Boolean)
        .map((id) => parseInt(id)),
    );
    tagIdSet.add(tagId);
    this.thread_tag_ids = `^${Array.from(tagIdSet).join('^')}^`;
    if (save) {
      await this.save();
    }
  }
  async removeTag(tagId: number, save = true) {
    const tagIdSet = new Set(
      (this.thread_tag_ids || '')
        .split('^')
        .filter(Boolean)
        .map((id) => parseInt(id)),
    );
    tagIdSet.delete(tagId);
    this.thread_tag_ids = `^${Array.from(tagIdSet).join('^')}^`;
    if (save) {
      await this.save();
    }
  }
  async canDeleteByUser(user: User) {
    let hasPermission = false;
    if (this.user_id === user.id) {
      // 删除自己的帖子
      hasPermission =
        this.is_draft ||
        (await user.hasPermission('thread.hideOwnThread')) ||
        (await user.hasPermission(`category${this.category_id}.thread.hideOwnThread`));
    }
    if (!hasPermission) {
      // 管理员权限
      hasPermission = await user.hasOneOfPermissions('thread.hide', `category${this.category_id}.thread.hide`);
    }
    return hasPermission;
  }
  async deleteByUser(user: User) {
    this.deleted_user_id = user.id;
    this.deleted_at = new Date();
    this.is_sticky = false; // 删除时，同步取消置顶
    this.sticky_at_other_categories = null; // 删除时，同步取消其他板块置顶
    await this.addTag(THREAD_TAG_ID_DELETED, false);
    await this.saveAndUpdateThreadCount();
  }
  async saveAndUpdateThreadCount(options?: SaveOptions<Partial<Thread>>) {
    await this.save(options);
    try {
      // 分类下帖子数量更新
      await updateCategoryThreadCount(this.sequelize, this.category_id, { transaction: options?.transaction });

      // 用户的帖子数量更新
      const threadUser = await getUser(this.sequelize, this.user_id);
      await threadUser.updateThreadCount({ transaction: options?.transaction });
    } catch (e) {
      console.warn(e);
      // 忽略报错
    }
  }
}

export const AllNotDeleteThreadFilter: WhereOptions<Partial<Thread>> = {
  deleted_at: {
    [Op.is]: null,
  },
  is_draft: false,
};

export const NormalThreadFilter: WhereOptions<Partial<Thread>> = {
  deleted_at: {
    [Op.is]: null,
  },
  is_approved: ThreadIsApproved.ok,
  is_draft: false,
};

const ThreadCache = createModelCache(Thread, {
  max: 500,
  getCacheKey: (m) => m.id,
});

export async function getThread(db: Sequelize, threadId: number): Promise<Thread> {
  return ThreadCache.getInCache(db, threadId) || (await getThreadModel(db)).findByPk(threadId);
}

export async function getUserTodayCreateCount(db: Sequelize, userId: number, categoryId?: number): Promise<number> {
  const ThreadModel = await getThreadModel(db);
  return ThreadModel.count({
    where: {
      user_id: userId,
      is_draft: false,
      ...(categoryId == null ? {} : { category_id: categoryId }),
      created_at: {
        [Op.gte]: moment().startOf('day').toDate(),
      },
    },
  });
}

export async function getUserCreateThreadCountInTimes(db: Sequelize, userId: number, times: [number, number]): Promise<number> {
  const ThreadModel = await getThreadModel(db);
  return ThreadModel.count({
    where: {
      user_id: userId,
      created_at: {
        [Op.gte]: new Date(times[0]),
        [Op.lte]: new Date(times[1]),
      },
    },
  });
}

const waitDBSync = new WeakMap<Sequelize, Promise<any>>();
export async function getThreadModel(db: Sequelize): Promise<typeof Thread> {
  if (waitDBSync.has(db)) {
    await waitDBSync.get(db);
  }
  if (db.models && db.models.Thread) {
    return db.models.Thread as typeof Thread;
  }
  class DBThread extends Thread {}
  DBThread.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        unique: true,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      last_posted_user_id: {
        type: DataTypes.INTEGER,
      },
      category_id: {
        type: DataTypes.INTEGER,
      },
      first_post_id: {
        type: DataTypes.INTEGER,
      },
      type: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
      is_approved: {
        type: DataTypes.INTEGER,
        defaultValue: ThreadIsApproved.checking,
      },
      is_sticky: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      sticky_at_other_categories: {
        type: DataTypes.TEXT,
      },
      is_essence: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      is_draft: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      disable_post: {
        type: DataTypes.BOOLEAN,
      },
      title: {
        type: DataTypes.STRING,
      },
      content_for_indexes: {
        type: DataTypes.TEXT,
      },
      thread_tag_ids: {
        type: DataTypes.TEXT,
      },
      post_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      view_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      deleted_user_id: {
        type: DataTypes.INTEGER,
      },
      posted_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      modified_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      deleted_at: {
        type: DataTypes.DATE,
      },
    },
    {
      sequelize: db,
      modelName: 'Thread',
      tableName: 'threads',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      // deletedAt: 'deleted_at',
      // paranoid: true,
      indexes: [
        { fields: ['category_id'] },
        { fields: ['user_id'] },
        { fields: ['deleted_user_id'] },
        { fields: ['is_sticky'] },
        { fields: ['posted_at'] },
        { fields: ['created_at'] },
        { fields: ['modified_at'] },
        { fields: ['category_id', 'is_sticky'] },
        { fields: ['category_id', 'posted_at'] },
        { fields: ['category_id', 'created_at'] },
        { fields: ['category_id', 'modified_at'] },
      ],
    },
  );

  waitDBSync.set(db, DBThread.sync({ alter: { drop: false } }));
  await waitDBSync.get(db);
  waitDBSync.delete(db);
  return DBThread;
}
