import { Model, Sequelize, DataTypes } from 'sequelize';
import LRUCache = require('lru-cache');

export interface SettingKeyValue {
  /** 站点 logo 图片 */
  logo: string;
  /** 站点 favicon 图片 */
  favicon: string;
  /** 站点是否关闭 */
  site_close: '0' | '1';
  /** 是否关闭新用户注册 */
  register_close: '0' | '1' | 'close_username';
  /** 关闭新用户注册原因 */
  register_close_reason: string;
  /** 新用户注册审核 */
  register_validate: '0' | '1';
  /** 发帖是否需要审核 */
  create_thread_validate: '0' | '1' | `[${string}]`; // 0 / 1 / [版块1ID, 版块2ID]
  /** 站点关闭原因 */
  site_close_msg: string;
  /** 站点名称 */
  site_name: string;
  /** 站点介绍 */
  site_introduction: string;
  /** 站点页面标题（展示浏览器标题） */
  site_title: string;
  /** 站点搜索关键字（用于 SEO） */
  site_keywords: string;
  /** 站点自定义 body 的额外 html，可以设置 <script> 等额外脚本 */
  site_custom_append_body_html: string;
  /** 站点自定义 head 的额外 html */
  site_custom_append_head_html: string;
  /** 记住登录天数（0 代表不记住），默认记住 3 天 */
  site_remember_login_days: `${number}`;
  /** 论坛是否前置登录（登录后，才能看到页面） */
  site_need_login_first: '0' | '1';
  /** 论坛是否开启了三方登录 */
  site_enable_third_platform_login: '0' | '1';
  /** 三方授权登录免审核 */
  site_third_platform_login_pass_validate: '0' | '1';
  /** 开启邮件功能 */
  site_enable_email: '0' | '1';
  /** 进入首页默认显示目标版块内容 */
  site_home_page_show_category: `${number}`;
  /** 每人每日在所有分类发帖 总量上限 */
  person_daily_create_thread: `${number}`;
  /** 每人每日在一个分类内 发帖总量上限 */
  person_daily_create_thread_category: `${number}`;
  /** 每人每日在指定分类内 发帖总量上限 */
  person_daily_create_thread_category_map: string; // JSON.stringify({ categoryId: count })
  /** 注册后几天才允许发帖 */
  create_thread_join_in_days: `${number}`;
  /** 注册后几天才允许评论/回复 */
  reply_thread_join_in_days: `${number}`;
  /** 论坛创建时间 */
  created_at: string; // YYYY-MM-DD HH:mm:ss
  /** 论坛上次被访问时间 */
  last_view_at: string; // YYYY-MM-DD HH:mm:ss
  /** 上传图片时自动压缩分辨率(前端压缩) */
  attachment_image_compress_size: `${number}`;
  /** 论坛附件/图片/视频 加载速度 */
  attachment_load_rate: `${number}`;
  /** 论坛附件/图片/视频 上传大小上限 */
  attachment_size_limit: `${number}`;
  /** 定制页面上展示的"由XX提供服务"的文案 */
  ui_power_by_text: string;
  /** 发帖页面上展示的 发帖提示内容 */
  ui_tip_publish_thread: string;
  /** 登录弹窗的 登录面板 自定义提示文案 */
  ui_tip_login: string;
  /** 登录弹窗的 注册面板 自定义提示文案 */
  ui_tip_register: string;
  /** 论坛首页的自定义提示文案 */
  ui_tip_home_page: string;
  /** 主题色 */
  ui_theme_primary_color: string;
  /** 主题是否为 暗色主题 */
  ui_theme_dark_mode: '0' | '1';
  /** 内容背景色 */
  ui_theme_content_bg_color: string;
  /** 页面背景色 */
  ui_theme_page_bg_color: string;
  /** 页面背景图 */
  ui_theme_page_bg_image: string | null;
  /** 自定义字体 */
  ui_font_family: string;
  /** 导航栏背景图 */
  ui_nav_bar_bg_image: string;
  /** 导航菜单背景图 */
  ui_nav_menu_bg_image: string;
  // 服务端内部字段（以 __ 开头的字段 默认不会返回给前端）
  /** 版块新帖消息形式 通知到管理员 */
  __internal_new_thread_notice_admin_email: 'all' | string; // 版块ID1,版块ID2
  /** 审核帖子/用户消息形式 通知到管理员 */
  __internal_reviewed_content_notice_admin_email: '0' | '1';
  /** 是否校验 referer */
  __internal_check_referer: '0' | '1';
  /** 邮箱配置: smtp host 和 port */
  __internal_mail_config_smtp_host_and_port: string | `${string}:${number}`;
  /** 邮箱配置: smtp username */
  __internal_mail_config_smtp_username: string;
  /** 邮箱配置: smtp password */
  __internal_mail_config_smtp_password: string;
  /** 论坛绑定的域名，多个用逗号分隔 */
  __internal_bind_hosts: string;
}

/**
 * 论坛设置项
 */
class SettingModel extends Model<Partial<SettingModel>> {
  /** 设置项 key */
  key: string;
  /** 设置项 值 */
  value: string;
}

const DBSettingCache = new LRUCache<Sequelize, SettingKeyValue>({ max: 1000, maxAge: 1000 * 60 * 60 });

export async function getCreateThreadDailyLimit(db: Sequelize, categoryId: number): Promise<number> {
  try {
    const categoryMap = JSON.parse(await getSettingValue(db, 'person_daily_create_thread_category_map'));
    const dailyLimit = parseInt(categoryMap[categoryId]);
    if (dailyLimit) {
      return dailyLimit;
    }
  } catch (e) {}
  try {
    const categoryLimit = parseInt(await getSettingValue(db, 'person_daily_create_thread_category'));
    if (categoryLimit) {
      return categoryLimit;
    }
  } catch (e) {}
  return 0;
}

export async function getSettingValue<K extends keyof SettingKeyValue>(db: Sequelize, key: K): Promise<SettingKeyValue[K]> {
  const settings = await getAllSettings(db);
  return settings?.[key];
}

export async function setSettingValue(db: Sequelize, update: Partial<SettingKeyValue>): Promise<void> {
  if (!Object.keys(update || {}).length) return;
  const SettingModel = await getSettingModel(db);
  await db.transaction(async (t) => {
    for (const key of Object.keys(update)) {
      const value = update[key];
      const setting = await SettingModel.findOne({ where: { key } });
      if (setting) {
        setting.value = value;
        await setting.save({ transaction: t });
      } else {
        await SettingModel.create({ key, value }, { transaction: t });
      }
    }
  });
  DBSettingCache.del(db); // 有更新后，清除缓存
}

export async function getAllSettings(db: Sequelize): Promise<SettingKeyValue> {
  let cachedSettings = DBSettingCache.get(db);
  if (cachedSettings) {
    return {
      ...cachedSettings,
    };
  }

  const allSettings = await (await getSettingModel(db)).findAll();
  const settingObj = {} as SettingKeyValue;
  allSettings.forEach((s) => (settingObj[s.key] = s.value));
  DBSettingCache.set(db, settingObj);
  return {
    ...settingObj,
  };
}

const waitDBSync = new WeakMap<Sequelize, Promise<any>>();
async function getSettingModel(db: Sequelize): Promise<typeof SettingModel> {
  if (waitDBSync.has(db)) {
    await waitDBSync.get(db);
  }
  if (db.models && db.models.Setting) {
    return db.models.Setting as typeof SettingModel;
  }
  class DBSetting extends SettingModel {}
  DBSetting.init(
    {
      // Model attributes are defined here
      key: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      value: {
        type: DataTypes.TEXT,
      },
    },
    {
      sequelize: db, // We need to pass the connection instance
      modelName: 'Setting', // We need to choose the model name
      tableName: 'settings',
      createdAt: false,
      updatedAt: false,
      indexes: [{ fields: ['key'] }],
    },
  );

  waitDBSync.set(
    db,
    DBSetting.sync({ alter: { drop: false } }).then(async () => {
      // 默认开启：审核消息同步到管理员
      if (!(await DBSetting.findOne({ where: { key: '__internal_reviewed_content_notice_admin_email' } }))) {
        await DBSetting.create({
          key: '__internal_reviewed_content_notice_admin_email',
          value: '1',
        });
      }
    }),
  );
  await waitDBSync.get(db);
  waitDBSync.delete(db);
  return DBSetting;
}
