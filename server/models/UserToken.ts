import { Model, Sequelize, DataTypes, Op } from 'sequelize';
import { createModelCache } from '../utils/model-cache';
import { TOKEN_DEFAULT_VALID_DAY_COUNT } from '../routes/bbs/const';
import { getSettingValue } from './Settings';

/**
 * 用户登录 token
 */
export class UserToken extends Model<Partial<UserToken>> {
  /** 评论 id */
  token: string;
  /** 用户 id */
  user_id: number;
  /** token 到期时间 */
  expired_at: Date;
  /** 创建时间 */
  created_at: Date;
  /** 更新时间 */
  updated_at: Date;
}

const UserTokenCache = createModelCache(UserToken, {
  max: 10000,
  getCacheKey: (m) => m.token,
});

/** 删除所有已过期 token 数据 */
async function clearExpiredToken(db: Sequelize) {
  const UserTokenModel = await getUserTokenModel(db);
  await UserTokenModel.destroy({
    where: {
      expired_at: {
        [Op.lt]: new Date(),
      },
    },
  });
}

/** 删除所有已临时 token */
export async function clearUserAllTmpToken(db: Sequelize, userId: number, excludeToken?: string) {
  const UserTokenModel = await getUserTokenModel(db);
  await UserTokenModel.destroy({
    where: {
      user_id: userId,
      expired_at: {
        [Op.lt]: new Date().getTime() + 24 * 60 * 60 * 1000 * 365,
      },
      ...(excludeToken
        ? {
            token: {
              [Op.not]: excludeToken,
            },
          }
        : {}),
    },
  });
}

const dbLastClearTokenTime = Symbol('dbLastClearTokenTime');
function checkClearExpiredToken(db: Sequelize) {
  if (!db[dbLastClearTokenTime]) {
    db[dbLastClearTokenTime] = 0;
  }
  if (Date.now() - db[dbLastClearTokenTime] > 12 * 60 * 60 * 1000) {
    // 距离上次清理超过 12 小时
    clearExpiredToken(db).catch(console.warn); // 异步清理 token
    db[dbLastClearTokenTime] = Date.now();
  }
}

async function getRememberDayCount(db: Sequelize): Promise<number> {
  let dayCount = parseInt(await getSettingValue(db, 'site_remember_login_days'));
  if (isNaN(dayCount) || dayCount < 0) {
    dayCount = TOKEN_DEFAULT_VALID_DAY_COUNT;
  }
  if (dayCount == 0) {
    // 如果 dayCount 配置为 0，服务器仍记住 token，前端 token 存 session 中
    dayCount = TOKEN_DEFAULT_VALID_DAY_COUNT;
  }
  return dayCount;
}

export async function loginByUserToken(db: Sequelize, token: string): Promise<{ userId: number; newLogin?: boolean }> {
  if (!token) return null;
  try {
    const userToken = UserTokenCache.getInCache(db, token) || (await (await getUserTokenModel(db)).findOne({ where: { token } }));
    if (userToken != null) {
      if (userToken.expired_at == null) {
        // 永不过期 token
        return { userId: userToken.user_id };
      }
      if (userToken.expired_at.getTime() < Date.now()) {
        // 已过期
        await userToken.destroy();
        return null;
      }
      let newLogin = false;

      const dayCount = await getRememberDayCount(db);
      if (userToken.expired_at.getTime() - Date.now() < (dayCount * 24 * 60 * 60 * 1000) / 2) {
        // token 有效期已过一半，续满
        userToken.expired_at = new Date(Date.now() + dayCount * 24 * 60 * 60 * 1000);
        await userToken.save();
        // token 续期 等同为新登录
        newLogin = true;
      }
      return { userId: userToken.user_id, newLogin };
    }
    return null;
  } finally {
    checkClearExpiredToken(db);
  }
}

export async function saveUserToken(db: Sequelize, userId: number, token: string, expired_at?: Date) {
  const UserTokenModel = await getUserTokenModel(db);
  let userToken = await UserTokenModel.findOne({ where: { token } });
  if (expired_at === null) {
    // null 代表长期有效（如：Admin Token）
  } else {
    const dayCount = await getRememberDayCount(db);
    expired_at = expired_at || new Date(Date.now() + dayCount * 24 * 60 * 60 * 1000);
  }
  if (userToken) {
    userToken.expired_at = expired_at;
    await userToken.save();
  } else {
    await UserTokenModel.create({
      user_id: userId,
      token,
      expired_at,
    });
  }
}

export async function getUserTokenByToken(db: Sequelize, token: string): Promise<UserToken> {
  return UserTokenCache.getInCache(db, token) || (await (await getUserTokenModel(db)).findOne({ where: { token } }));
}

export async function getValidUserTokens(db: Sequelize, user_id: number): Promise<UserToken[]> {
  if (user_id == null || isNaN(user_id)) return [];
  const UserTokenModel = await getUserTokenModel(db);
  const userTokens = await UserTokenModel.findAll({ where: { user_id } });
  return (userTokens || []).filter((userToken) => userToken.expired_at == null || userToken.expired_at.getTime() > Date.now());
}

const waitDBSync = new WeakMap<Sequelize, Promise<any>>();
export async function getUserTokenModel(db: Sequelize): Promise<typeof UserToken> {
  if (waitDBSync.has(db)) {
    await waitDBSync.get(db);
  }
  if (db.models && db.models.UserToken) {
    return db.models.UserToken as typeof UserToken;
  }
  class DBUserToken extends UserToken {}
  DBUserToken.init(
    {
      token: {
        type: DataTypes.TEXT,
        allowNull: false,
        unique: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      expired_at: {
        type: DataTypes.DATE,
      },
    },
    {
      sequelize: db,
      modelName: 'UserToken',
      tableName: 'user_token',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [{ fields: ['token'] }, { fields: ['user_id'] }, { fields: ['expired_at'] }],
    },
  );

  waitDBSync.set(db, DBUserToken.sync({ alter: { drop: false } }));
  await waitDBSync.get(db);
  waitDBSync.delete(db);
  return DBUserToken;
}
