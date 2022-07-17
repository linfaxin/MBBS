import fetchApi from '@/api/base/fetch';

export interface Setting {
  /** 站点 logo 图片 */
  logo: string;
  /** 站点 favicon 图片 */
  favicon: string;
  /** 站点是否关闭 */
  site_close: '0' | '1';
  /** 是否关闭新用户注册 */
  register_close: '0' | '1';
  /** 关闭新用户注册原因 */
  register_close_reason: string;
  /** 新用户注册审核 */
  register_validate: '0' | '1';
  /** 发帖审核 */
  create_thread_validate: '0' | '1' | string;
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
  site_remember_login_days: `${number}` | '';
  /** 论坛是否前置登录（登录后，才能看到页面） */
  site_need_login_first: '0' | '1';
  /** 论坛是否开启了三方登录 */
  site_enable_third_platform_login: '0' | '1';
  /** 使用 xxx.mbbs.cc 域名访问论坛时，默认重定向至 已设置的自定义域名 */
  site_redirect_to_custom_host: '0' | '1';
  /** 开启邮件功能 */
  site_enable_email: '0' | '1';
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
  /** 上传图片时自动压缩分辨率 */
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
  /** 自定义字体 */
  ui_font_family: string;
  /** 导航栏背景图 */
  ui_nav_bar_bg_image: string | null;
  /** 导航菜单背景图 */
  ui_nav_menu_bg_image: string | null;
  /** 板块新帖通知到管理员邮箱 */
  __internal_new_thread_notice_admin_email: 'all' | string; // 板块ID1,板块ID2
  /** 审核帖子/用户通知到管理员邮箱 */
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

let getAllSettingPromise: null | Promise<Setting>;

export async function getAll(): Promise<Setting> {
  if (!getAllSettingPromise) {
    getAllSettingPromise = fetchApi('setting/getAll')
      .then((result) => result.data)
      .catch((e) => {
        getAllSettingPromise = null;
        throw e;
      });
  }
  return getAllSettingPromise;
}

export async function set<K extends keyof Setting>(key: K, value: Setting[K]): Promise<boolean> {
  return fetchApi({
    pathOrUrl: 'setting/set',
    method: 'post',
    data: {
      key,
      value,
    },
  }).then(() => true);
}

export async function batchSet<K extends keyof Setting>(update: Partial<Setting>): Promise<boolean> {
  return fetchApi({
    pathOrUrl: 'setting/batchSet',
    method: 'post',
    data: update,
  }).then(() => true);
}
