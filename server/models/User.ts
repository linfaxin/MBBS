import { Model, Sequelize, DataTypes, Transactionable } from 'sequelize';
import { getGroupPermissions, PermissionType } from './GroupPermission';
import { getUserGroupId, setUserGroupId } from './GroupUser';
import { createModelCache } from '../utils/model-cache';
import { GROUP_ID_ADMIN, GROUP_ID_TOURIST } from '../routes/bbs/const';
import { getGroupById, Group } from './Group';
import { getThreadModel, NormalThreadFilter } from './Thread';
import { getPostModel } from './Post';
import { getDBNameFromDB } from './db';

/** 用户状态 */
export enum UserStatus {
  /** 正常 */
  Normal = 0,
  /** 禁用 */
  Disabled = 1,
  /** 审核中 */
  Checking = 2,
  /** 审核拒绝 */
  CheckFail = 3,
  /** 审核忽略 */
  CheckIgnore = 4,
}

/**
 * 论坛内的一个用户实例
 */
export class User extends Model<Partial<User>> {
  id: number;
  /** 用户账号 */
  username: string;
  /** 密码 hash */
  password: string;
  /** 昵称 */
  nickname: string;
  /** 手机号 */
  mobile: string;
  /** 绑定的邮箱 */
  email: string;
  /** 论坛新消息发送至邮箱开关 */
  msg_to_email_enable: boolean;
  /** 个人签名 */
  signature: string;
  /** 上次登录 ip */
  last_login_ip: string;
  /** 注册 ip */
  register_ip: string;
  /** 注册原因 */
  register_reason: string;
  /** 注册拒绝原因 */
  reject_reason: string;
  /** 注册邀请码 */
  register_invitation_code: string;
  /** 发帖数 */
  thread_count: number;
  /** 评论数 */
  post_count: number;
  /** 关注了多少人 */
  follow_count: number;
  /** 被关注了多少人（粉丝数） */
  fans_count: number;
  /** 喜欢（点赞）数量  */
  liked_count: number;
  /** 用户状态：0 正常 1 禁用 2 审核中 3 审核拒绝 4 审核忽略 */
  status: UserStatus;
  /** 头像地址  */
  avatar: string;
  /** 头像修改时间  */
  avatar_at: Date;
  /** 上次登录时间 */
  login_at: Date;
  /** 付费加入时间 */
  joined_at: Date;
  /** 付费到期时间 */
  expired_at: Date;
  /** 创建时间 */
  created_at: Date;
  /** 更新时间 */
  updated_at: Date;
  /** 获取当前用户的 分组id */
  async getGroupId(): Promise<number> {
    if (this.username === 'admin') return GROUP_ID_ADMIN;
    return getUserGroupId(this.sequelize, this.id);
  }
  /** 设置当前用户的 分组id */
  async setGroupId(groupId: number): Promise<void> {
    await setUserGroupId(this.sequelize, this.id, groupId);
  }
  /** 是否是管理员 */
  async isAdmin(): Promise<boolean> {
    return this.username === 'admin' || (await this.getGroupId()) === GROUP_ID_ADMIN;
  }
  /** 当前用户是否有权限 */
  hasPermission(permission: PermissionType): Promise<boolean> {
    return this.hasOneOfPermissions(permission);
  }
  /** 当前用户是否有其中一个权限 */
  async hasOneOfPermissions(...permissions: PermissionType[]): Promise<boolean> {
    if (await this.isAdmin()) {
      // 管理员拥有全部权限
      return true;
    }
    let groupId = this.status != null && this.status !== UserStatus.Normal ? GROUP_ID_TOURIST : await this.getGroupId(); // 状态非正常用户，权限同游客
    const allPermissions = await getGroupPermissions(this.sequelize, groupId);
    for (const p of permissions) {
      if (allPermissions.includes(p)) return true;
    }
    return false;
  }
  /** 更新当前用户的帖子数量 */
  async updateThreadCount(option?: Transactionable) {
    const ThreadModel = await getThreadModel(this.sequelize);
    this.thread_count = await ThreadModel.count({
      where: {
        ...NormalThreadFilter,
        user_id: this.id,
      },
      ...option,
    });
    await this.save({ ...option });
  }
  /** 更新当前用户的评论数量 */
  async updatePostCount() {
    const PostModel = await getPostModel(this.sequelize);
    this.post_count = await PostModel.count({
      where: {
        user_id: this.id,
        is_first: false,
        is_approved: true,
        is_comment: false,
      },
    });
    await this.save();
  }
  /** json 格式化当前对象（排除私密字段） */
  toJSON() {
    return {
      ...super.toJSON(),
      password: undefined,
      last_login_ip: undefined,
      register_reason: undefined,
      register_invitation_code: undefined,
      email: !!this.email, // 默认隐藏真实邮箱
    } as any;
  }
  /** 给前端展示的 json 数据 */
  async toViewJSON(option?: { showRealEmail?: boolean }) {
    const { showRealEmail } = option || {};
    let group: Partial<Group>;
    if (await this.isAdmin()) {
      group = { id: GROUP_ID_ADMIN, name: '系统管理员' };
    }
    const groupId = await this.getGroupId();
    if (groupId) {
      group = (await getGroupById(this.sequelize, groupId))?.toJSON() || group;
    }
    const userJSON = this.toJSON();
    if (showRealEmail) {
      userJSON.email = this.email;
    }
    return {
      ...userJSON,
      group,
    };
  }
  /** json 格式化当前对象（包含私密信息字段） */
  toJSONAllField() {
    return super.toJSON();
  }
}

const UserCache = createModelCache(User, {
  max: 1000,
  maxAge: 1000 * 60 * 60 * 6,
  getCacheKey: (m) => m.id,
});

export async function getUser(db: Sequelize, userId: number): Promise<User> {
  return UserCache.getInCache(db, userId) || (await getUserModel(db)).findByPk(userId);
}

export async function getUserByName(db: Sequelize, username: string): Promise<User> {
  if (!username) return null;
  const dbName = getDBNameFromDB(db);
  if (dbName === username) {
    // 论坛站点同名账号用户默认为 admin
    username = 'admin';
  }
  const allCachedUsers = UserCache.getAllCachedValue(db);
  return allCachedUsers.find((u) => u.username === username) || (await getUserModel(db)).findOne({ where: { username } });
}

export async function getUserByEmail(db: Sequelize, email: string): Promise<User> {
  if (!email) return null;
  const allCachedUsers = UserCache.getAllCachedValue(db);
  return allCachedUsers.find((u) => u.email === email) || (await getUserModel(db)).findOne({ where: { email } });
}

const waitDBSync = new WeakMap<Sequelize, Promise<any>>();
/**
 * 返回用户的模型对象（UserDTO）
 * @param db 数据库实例
 */
export async function getUserModel(db: Sequelize): Promise<typeof User> {
  if (waitDBSync.has(db)) {
    await waitDBSync.get(db);
  }
  if (db.models && db.models.User) {
    return db.models.User as typeof User;
  }
  class DBUser extends User {}
  DBUser.init(
    {
      // Model attributes are defined here
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        unique: true,
        primaryKey: true,
      },
      username: {
        type: DataTypes.TEXT,
        allowNull: false,
        unique: true,
      },
      password: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      nickname: {
        type: DataTypes.TEXT,
      },
      mobile: {
        type: DataTypes.TEXT,
      },
      email: {
        type: DataTypes.TEXT,
      },
      msg_to_email_enable: {
        type: DataTypes.BOOLEAN,
      },
      signature: {
        type: DataTypes.TEXT,
      },
      last_login_ip: {
        type: DataTypes.TEXT,
      },
      register_ip: {
        type: DataTypes.TEXT,
      },
      register_reason: {
        type: DataTypes.TEXT,
      },
      reject_reason: {
        type: DataTypes.TEXT,
      },
      register_invitation_code: {
        type: DataTypes.TEXT,
      },
      thread_count: {
        type: DataTypes.INTEGER,
      },
      post_count: {
        type: DataTypes.INTEGER,
      },
      follow_count: {
        type: DataTypes.INTEGER,
      },
      fans_count: {
        type: DataTypes.INTEGER,
      },
      liked_count: {
        type: DataTypes.INTEGER,
      },
      status: {
        type: DataTypes.INTEGER,
        defaultValue: UserStatus.Normal,
      },
      avatar: {
        type: DataTypes.TEXT,
      },
      avatar_at: {
        type: DataTypes.DATE,
      },
      login_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      joined_at: {
        type: DataTypes.DATE,
      },
      expired_at: {
        type: DataTypes.DATE,
      },
    },
    {
      sequelize: db,
      modelName: 'User',
      tableName: 'users',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
      paranoid: true,
      indexes: [{ fields: ['username'] }, { fields: ['email'] }, { fields: ['mobile'] }],
    },
  );

  waitDBSync.set(db, DBUser.sync({ alter: { drop: false } }));
  await waitDBSync.get(db);
  waitDBSync.delete(db);
  return DBUser;
}
