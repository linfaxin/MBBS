/**
 * UI 界面的自定义接口，控制页面一些自定义功能和渲染
 */
import { User } from '@/api/base/user';
import { Setting } from '@/api/setting';
import { Thread } from '@/api/thread';
import { Post } from '@/api/post';

export interface ApiUIInterface {
  /**
   * 渲染帖子内容前拦截（原始 markdown 内容）
   * @return {string} 修改后的 markdown 内容
   */
  onPreviewThreadContentMarkdown?(md: string, thread: Thread): string;

  /**
   * 渲染帖子内容前拦截（待渲染的 html 内容）
   * @return {string} 修改后的 html 内容
   */
  onPreviewThreadContentHtml?(html: string, thread: Thread): string;

  /**
   * 渲染帖子评论内容前拦截（原始 markdown 内容）
   * @return {string} 修改后的 markdown 内容
   */
  onPreviewPostContentMarkdown?(md: string, post: Post): string;

  /**
   * 渲染帖子评论内容前拦截（待渲染的 html 内容）
   * @return {string} 修改后的 html 内容
   */
  onPreviewPostContentHtml?(html: string, post: Post): string;

  /**
   * 查看评论回复内容前拦截
   * @return {string} 修改后的 html 内容
   */
  onPreviewCommentPostText?(text: string, post: Post): string;

  /**
   * 点击渲染后的链接
   */
  onClickPreviewLink?(url: string): void;

  /**
   * 点击渲染后的图片
   */
  onClickPreviewImage?(imgUrl: string): void;

  /**
   * 自定义分享
   * @param url 要分享的页面 url
   */
  onShare?(url: string): void;

  /**
   * 唤起登录
   * @return 返回登录后的论坛 token，返回空则代表取消登录
   */
  onCallLogin?(): string | Promise<string>;

  /**
   * 显示个人详情页
   */
  onShowUserInfoPage?(user: User): void;

  /**
   * 显示我的个人中心页面，如果不设置则会降级到 onShowUserInfoPage
   */
  onShowPersonalCenterPage?(user: User): void;

  /**
   * 导航栏标题变化监听
   * @param title
   */
  onTopBarTitleChange?(title?: string): void;

  /**
   * 定制详情页标题右侧更多按钮菜单内容
   * @param thread 帖子详情数据
   * @param menu 默认的菜单项
   * @return 返回要展示的菜单
   */
  showThreadDetailMenu?(thread: Thread, menu: Array<{ label: string; onClick: () => void }>): Array<{ label: string; onClick: () => void }>;

  /**
   * 帖子评论操作区域的额外操作按钮
   */
  threadPostExtraButtons?: Array<{ text: string; onClick: (post: Post) => void }>;

  /**
   * 发帖前检查
   * @param categoryId
   * @return {Promise} reject 则代表校验失败，禁止发帖，并伴随默认的弹窗错误提示
   */
  checkBeforeCreateThread?(categoryId: number): Promise<void>;

  /**
   * 帖子评论前检查
   * @return {Promise} reject 则代表校验失败，禁止评论，并伴随默认的弹窗错误提示
   */
  checkBeforeCreatePost?(thread: Thread): Promise<void>;

  /**
   * 回复评论前检查
   * @return {Promise} reject 则代表校验失败，禁止回复，并伴随默认的弹窗错误提示
   */
  checkBeforeCreatePostComment?(post: Post): Promise<void>;

  /**
   * 是否隐藏顶部导航栏
   */
  hideTopBar?: boolean;
  /**
   * 是否左侧菜单栏
   */
  hideSlideMenu?: boolean;

  /**
   * 论坛配置变化监听，可以在监听中修改 setting 值
   */
  onSettingChange?(settings?: Setting): Setting;

  /**
   * 页面初始化完成，页面渲染前 调用
   */
  onLoad?(): Promise<void>;

  /**
   * 初始化当前登录的用户
   * @param loginUser 已登录的用户
   * @return {User} 返回代表初始化登录的用户，如果返回空则代表退出登录
   */
  onInitLoginUser?(loginUser: User | null): Promise<User | { token: string } | null>;

  /**
   * 页面首次渲染后 回调
   */
  onRender?(): Promise<void>;
}

const ApiUI: ApiUIInterface = (window as any).MBBS_UI_API || {};
(window as any).MBBS_UI_API = ApiUI;

export default ApiUI;
