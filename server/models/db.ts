import { Sequelize } from 'sequelize';
import { v4 as uuidV4 } from 'uuid';
import * as LRUCache from 'lru-cache';
import { Request } from 'express';
import * as dayjs from 'dayjs';
import { DB_NAME, DBDataDir, GROUP_ID_DEFAULT, GROUP_ID_TOURIST } from '../routes/bbs/const';
import { clearAllModelCache } from '../utils/model-cache';
import { getUserModel } from './User';
import { hashPassword } from '../utils/password-util';
import { saveUserToken } from './UserToken';
import { getCategoryModel } from './Category';
import { getGroupModel } from './Group';
import { AllGlobalPermissions, DefaultNormalUserPermissions, DefaultTouristUserPermissions, setGroupPermissions } from './GroupPermission';
import { setSettingValue } from './Settings';
import { isDevEnv } from '../utils/env-util';
import { getThreadTagModel, THREAD_TAG_ID_ESSENCE } from './ThreadTag';

const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');

const dbCache = new LRUCache<string, Sequelize>({
  max: 1000,
  maxAge: 1000 * 60 * 60,
  dispose(key, value) {
    try {
      if (value) {
        clearAllModelCache(value);
        value.close();
      }
    } catch (e) {}
  },
});

export function getDBFilePath(dbName: string) {
  if (!dbName) return null;
  dbName = dbName.toLowerCase();
  if (!dbName.endsWith('.db')) dbName = `${dbName}.db`;
  return path.join(DBDataDir, '/', dbName);
}

const DBPathSymbol = Symbol('DBPath');
export function getDBPathFromDB(db: Sequelize): string {
  return db?.[DBPathSymbol];
}

export function getDBNameFromDB(db: Sequelize): string {
  const dbPath: string = db?.[DBPathSymbol];
  if (!dbPath) return null;
  return dbPath.split('/').pop().replace(/\.db$/, '');
}

export function getDBNameFromApiRequest(req: Request) {
  return DB_NAME;
}

export function getDBNameFromHost(hostOrUrl: string) {
  return DB_NAME;
}

export async function getDB(dbName: string): Promise<Sequelize> {
  if (!dbName) return null;
  dbName = dbName.toLowerCase();
  const dbPath = getDBFilePath(dbName);
  let db = dbCache.get(dbPath);
  if (db && !fs.existsSync(dbPath)) {
    dbCache.del(dbPath);
    db = null;
  }
  if (db) {
    return db;
  }
  if (!fs.existsSync(dbPath)) {
    return null;
  }
  db = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: isDevEnv(),
  });
  db[DBPathSymbol] = dbPath;
  dbCache.set(dbPath, db);
  getThreadTagModel(db); // 初始化帖子标签 & 补齐帖子标签
  return db;
}

export async function hasDB(dbName): Promise<boolean> {
  if (!dbName) return false;
  dbName = dbName.toLowerCase();
  const dbPath = getDBFilePath(dbName);
  return fs.existsSync(dbPath);
}

/**
 * 创建一个论坛数据库文件
 * @param adminPassword 管理员账号
 */
export async function createDB(adminPassword: string): Promise<Sequelize> {
  const dbName = DB_NAME;
  const dbPath = getDBFilePath(dbName);
  if (fs.existsSync(dbPath)) {
    throw new Error(`数据库已存在: ${dbPath}`);
  }
  fse.mkdirsSync(path.dirname(dbPath));
  fs.writeFileSync(dbPath, Buffer.alloc(0));
  dbCache.del(dbPath);

  const db = await getDB(dbName);

  // db 初始化数据准备

  try {
    // 站点 db 中创建管理员账户
    const UserModel = await getUserModel(db);
    const adminUser = UserModel.build({
      username: 'admin',
      password: hashPassword(adminPassword),
      nickname: '管理员',
    });
    await adminUser.save();
    const token = uuidV4();
    await saveUserToken(db, 1, token);

    // 创建默认分类
    const CategoryModel = await getCategoryModel(db);
    const defaultCategory = CategoryModel.build({
      name: '默认分类',
      thread_count: 0,
      sort: 1,
      filter_thread_tag_ids: String(THREAD_TAG_ID_ESSENCE),
    });
    await defaultCategory.save();

    // 创建初始化角色
    const GroupModel = await getGroupModel(db);

    const defaultGroupId = GROUP_ID_DEFAULT;
    const defaultGroup = GroupModel.build({
      id: defaultGroupId,
      name: '普通用户',
      default: true,
    });
    await defaultGroup.save();

    // 创建默认分组的权限
    await setGroupPermissions(db, defaultGroupId, DefaultNormalUserPermissions);

    // 异步创建论坛的一些数据，不阻塞用户等待
    Promise.resolve().then(async () => {
      // 创建游客默认权限
      await setGroupPermissions(db, GROUP_ID_TOURIST, DefaultTouristUserPermissions);

      // 设置创建时间
      await setSettingValue(db, { created_at: dayjs().format('YYYY-MM-DD HH:mm:ss') });

      // 设置管理员角色和权限
      const managerGroup = await GroupModel.create({ name: '管理员' });
      const managerGroupId = managerGroup.id;
      await setGroupPermissions(db, managerGroupId, AllGlobalPermissions);
    });
    return db;
  } catch (e) {
    try {
      fs.unlinkSync(dbPath);
      dbCache.del(dbPath);
    } catch (ignore) {}
    throw e;
  }
}
