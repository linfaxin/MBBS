/** 论坛数据库名 */
export const DB_NAME = process.env.MBBS_DB_NAME || 'bbs';

/** 储存 数据库文件 的默认目录 */
export const DBDataDir = process.env.MBBS_DB_DIR || './';

/** 储存上传资源文件的默认目录 */
export const DBResourceDir = process.env.MBBS_RES_DIR || './resources';

/** 放于请求头，标识当前请求的来源用户id */
export const HEADER_USERID = 'mbbs-userid';

/** 放于请求头，携带当前用户身份 */
export const HEADER_TOKEN = 'authorization';

/** admin 角色ID值，可用于设置角色昵称/图标 */
export const GROUP_ID_ADMIN = 6;

/** 游客分组ID值，可用于设置游客的权限 */
export const GROUP_ID_TOURIST = 7;

/** 默认分组（创建站点时 自动创建） */
export const GROUP_ID_DEFAULT = 10;

/** 登录后 token 有效期天数 */
export const TOKEN_DEFAULT_VALID_DAY_COUNT = 3;
