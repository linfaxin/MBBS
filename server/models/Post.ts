import { DataTypes, Model, Op, Sequelize, NonNullFindOptions } from 'sequelize';
import { createModelCache } from '../utils/model-cache';
import { getUser, User } from './User';
import { getThread } from './Thread';
import { NotFoundError } from 'routing-controllers';
import { hasUserLikedPost } from './LikePostUser';

/**
 * 帖子内容/帖子评论/评论回复 模型
 */
export class Post extends Model<Partial<Post>> {
  /** 评论 ID */
  id: number;
  /** 评论者 ID */
  user_id: number;
  /** 帖子 ID */
  thread_id: number;
  /** 回复所在的目标评论的 ID （当前数据是评论的一条回复） */
  reply_post_id: number;
  /** 回复所在的目标评论的 用户ID （当前数据是评论的一条回复） */
  reply_user_id: number;
  /** 指定回复目标评论的 ID （当前数据是评论的一条回复） */
  comment_post_id: number;
  /** 指定回复目标评论的 用户ID （当前数据是评论的一条回复） */
  comment_user_id: number;
  /** 内容 */
  content: string;
  /** 创建时的 ip */
  ip: string;
  /** 评论内的回复数量 / 帖子的回复数量 */
  reply_count: number;
  /** 点赞数量 */
  like_count: number;
  /** 是否合法 */
  is_approved: boolean;
  /** 是否在帖子评论里被置顶 */
  is_sticky: boolean;
  /** 是否是帖子内容 */
  is_first: boolean;
  /** 是否是评论回复 */
  is_comment: boolean;
  /** 删除的用户id */
  deleted_user_id: number;
  /** 创建时间 */
  created_at: Date;
  /** 更新时间 */
  updated_at: Date;
  /** 删除时间 */
  deleted_at: Date;
  /** 是否能被指定用户修改 */
  async canEditByUser(currentUser: User): Promise<boolean> {
    if (!currentUser) return false;
    const thread = await getThread(this.sequelize, this.thread_id);
    if (thread == null) throw new NotFoundError('帖子未找到');
    let hasPermission = false;
    if (this.user_id === currentUser.id) {
      // 修改自己的帖子
      hasPermission = await currentUser.hasOneOfPermissions('thread.editOwnPost', `category${thread.category_id}.thread.editOwnPost`);
    }
    if (!hasPermission) {
      // 管理员权限
      hasPermission = await currentUser.hasOneOfPermissions('thread.editPosts', `category${thread.category_id}.thread.editPosts`);
    }
    return hasPermission;
  }
  /** 是否能被指定用户软删除 */
  async canHideByUser(currentUser: User): Promise<boolean> {
    if (!currentUser) return false;
    const thread = await getThread(this.sequelize, this.thread_id);
    if (thread == null) throw new NotFoundError('帖子未找到');
    let hasPermission = false;
    if (this.user_id === currentUser.id) {
      // 软删自己的帖子
      hasPermission = await currentUser.hasOneOfPermissions('thread.hideOwnPost', `category${thread.category_id}.thread.hideOwnPost`);
    }
    if (!hasPermission && thread.user_id === currentUser.id) {
      // 删除自己帖子下的他人评论
      hasPermission = await currentUser.hasOneOfPermissions(
        'thread.hideOwnThreadAllPost',
        `category${thread.category_id}.thread.hideOwnThreadAllPost`,
      );
    }
    if (!hasPermission) {
      // 管理员权限
      hasPermission = await currentUser.hasOneOfPermissions('thread.hidePosts', `category${thread.category_id}.thread.hidePosts`);
    }
    return hasPermission;
  }
  async updatePostReplyCount() {
    const PostModel = await getPostModel(this.sequelize);
    if (this.is_first) {
      // 是帖子评论
      this.reply_count = await PostModel.count({
        where: {
          thread_id: this.thread_id,
          is_first: false,
          is_approved: true,
          is_comment: false,
        },
      });
      // 同时更新 thread 的 post_count
      const thread = await getThread(this.sequelize, this.thread_id);
      thread.post_count = this.reply_count;
      await thread.save();
    } else {
      // 是评论回复
      this.reply_count = await PostModel.count({
        where: {
          reply_post_id: this.id,
          is_first: false,
          is_approved: true,
          is_comment: true,
        },
      });
    }
    await this.save();
  }
  async delete() {
    await this.destroy();

    if (this.reply_post_id && this.is_comment) {
      const replyPost = await getPost(this.sequelize, this.reply_post_id);
      if (replyPost) {
        await replyPost.updatePostReplyCount();
      }
    } else {
      const thread = await getThread(this.sequelize, this.thread_id);
      const threadFirstPost = await getPost(this.sequelize, thread.first_post_id);
      if (threadFirstPost) {
        await threadFirstPost.updatePostReplyCount();
      }

      // 更新用户回复数量
      const postUser = await getUser(this.sequelize, this.user_id);
      await postUser.updatePostCount();
    }
  }
  async toViewJSON(viewUser: User) {
    const thread = await getThread(this.sequelize, this.thread_id);
    if (thread == null) throw new NotFoundError('帖子未找到');
    return {
      ...this.toJSON(),
      user: await (await getUser(this.sequelize, this.user_id)).toViewJSON(),
      comment_user: this.comment_user_id ? await (await getUser(this.sequelize, this.comment_user_id)).toViewJSON() : undefined,
      is_liked: !!viewUser && (await hasUserLikedPost(this.sequelize, this.id, viewUser.id)),
      can_sticky:
        !!viewUser &&
        (await viewUser.hasOneOfPermissions('thread.stickyOwnThreadPost', `category${thread.category_id}.thread.stickyOwnThreadPost`)) && // 有权限
        (thread.user_id === viewUser.id || (await viewUser.isAdmin())), // 帖子作者或 admin
      can_edit: !!viewUser && (await this.canEditByUser(viewUser)),
      can_hide: !!viewUser && (await this.canHideByUser(viewUser)),
      can_like: !!viewUser && (await viewUser.hasOneOfPermissions('thread.likePosts', `category${thread.category_id}.thread.likePosts`)),
    };
  }
}

// 开启缓存：帖子列表需要频繁拉取 帖子内容(firstPost)
const PostCache = createModelCache(Post, {
  max: 1000,
  getCacheKey: (m) => m.id,
});

export async function getPost(
  db: Sequelize,
  postId: number,
  options?: Partial<Omit<NonNullFindOptions<Post['_attributes']>, 'where'>>,
): Promise<Post> {
  return PostCache.getInCache(db, postId) || (await getPostModel(db)).findByPk(postId, options);
}

// 批量读取 post
export async function getPosts(
  db: Sequelize,
  postIds: number[],
  options?: Partial<Omit<NonNullFindOptions<Post['_attributes']>, 'where'>>,
): Promise<Post[]> {
  const PostModel = await getPostModel(db);
  return await PostModel.findAll({
    where: { id: postIds },
    ...options,
  });
}

export async function getUserCreatePostCountInTimes(db: Sequelize, userId: number, times: [number, number]): Promise<number> {
  const PostModel = await getPostModel(db);
  return PostModel.count({
    where: {
      user_id: userId,
      is_first: false,
      created_at: {
        [Op.gte]: new Date(times[0]),
        [Op.lte]: new Date(times[1]),
      },
    },
  });
}

const waitDBSync = new WeakMap<Sequelize, Promise<any>>();
export async function getPostModel(db: Sequelize): Promise<typeof Post> {
  if (waitDBSync.has(db)) {
    await waitDBSync.get(db);
  }
  if (db.models && db.models.Post) {
    return db.models.Post as typeof Post;
  }
  class DBPost extends Post {}
  DBPost.init(
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
      thread_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      reply_post_id: {
        type: DataTypes.INTEGER,
      },
      reply_user_id: {
        type: DataTypes.INTEGER,
      },
      comment_post_id: {
        type: DataTypes.INTEGER,
      },
      comment_user_id: {
        type: DataTypes.INTEGER,
      },
      content: {
        type: DataTypes.TEXT,
      },
      ip: {
        type: DataTypes.TEXT,
      },
      reply_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      like_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      is_approved: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      is_sticky: {
        type: DataTypes.BOOLEAN,
      },
      is_first: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      is_comment: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      deleted_user_id: {
        type: DataTypes.INTEGER,
      },
    },
    {
      sequelize: db,
      modelName: 'Post',
      tableName: 'posts',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
      paranoid: true,
      indexes: [{ fields: ['user_id'] }, { fields: ['deleted_user_id'] }, { fields: ['thread_id'] }, { fields: ['reply_post_id'] }],
    },
  );

  waitDBSync.set(db, DBPost.sync({ alter: { drop: false } }));
  await waitDBSync.get(db);
  waitDBSync.delete(db);
  return DBPost;
}
