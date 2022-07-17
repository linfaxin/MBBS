import { Model, Sequelize, DataTypes } from 'sequelize';
import { createModelCache } from '../utils/model-cache';
import { Post } from './Post';

/**
 * 帖子/评论 点赞记录
 */
export class LikePostUser extends Model<Partial<LikePostUser>> {
  /** 评论 id */
  post_id: number;
  /** 用户 id */
  user_id: number;
}

export async function hasUserLikedPost(db: Sequelize, postId: number, userId: number): Promise<boolean> {
  const LikePostUserModel = await getLikePostUserModel(db);
  return !!(await LikePostUserModel.findOne({ where: { post_id: postId, user_id: userId } }));
}

export async function getPostLikedUserIds(db: Sequelize, postId: number): Promise<number[]> {
  const LikePostUserModel = await getLikePostUserModel(db);
  return (await LikePostUserModel.findAll({ where: { post_id: postId } })).map((m) => m.user_id);
}

export async function setUserLikePost(db: Sequelize, post: Post, userId: number, isLike: boolean) {
  const LikePostUserModel = await getLikePostUserModel(db);
  const likedModel = await LikePostUserModel.findOne({ where: { post_id: post.id, user_id: userId } });
  if (isLike) {
    // 添加喜欢
    if (!likedModel) {
      await LikePostUserModel.create({ post_id: post.id, user_id: userId });
    }
  } else {
    // 删除喜欢
    if (likedModel) {
      await likedModel.destroy();
    }
  }

  // 更新已喜欢数据
  const allLikedUserIds = await getPostLikedUserIds(db, post.id);
  if (post.like_count !== allLikedUserIds.length) {
    post.like_count = allLikedUserIds.length;
    await post.save();
  }
}

const waitDBSync = new WeakMap<Sequelize, Promise<any>>();
export async function getLikePostUserModel(db: Sequelize): Promise<typeof LikePostUser> {
  if (waitDBSync.has(db)) {
    await waitDBSync.get(db);
  }
  if (db.models && db.models.LikePostUser) {
    return db.models.LikePostUser as typeof LikePostUser;
  }
  class DBLikePostUser extends LikePostUser {}
  DBLikePostUser.init(
    {
      post_id: {
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
      modelName: 'LikePostUser',
      tableName: 'post_user',
      createdAt: 'created_at',
      updatedAt: false,
      indexes: [{ fields: ['post_id'] }, { fields: ['user_id'] }],
    },
  );

  waitDBSync.set(db, DBLikePostUser.sync({ alter: { drop: false } }));
  await waitDBSync.get(db);
  waitDBSync.delete(db);
  return DBLikePostUser;
}
