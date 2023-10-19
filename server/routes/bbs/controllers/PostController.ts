import { BodyParam, Delete, Get, JsonController, Param, Post, QueryParam, Req, UnauthorizedError } from 'routing-controllers';
import { Request } from 'express';
import CurrentUser from '../decorators/CurrentUser';
import { getUser, User, UserStatus } from '../../../models/User';
import CurrentDB from '../decorators/CurrentDB';
import { Op, Sequelize, WhereOptions } from 'sequelize';
import { getPost, getPostModel, getUserCreatePostCountInTimes, Post as PostClass } from '../../../models/Post';
import { setUserLikePost } from '../../../models/LikePostUser';
import { getThread, Thread } from '../../../models/Thread';
import { WrapDataExtraKey } from '../global-interceptors/WrapDataInterceptors';
import { formatReqIP, formatSubString } from '../../../utils/format-utils';
import UIError from '../../../utils/ui-error';
import { hasOneOfPermissions, hasPermission } from '../../../models/GroupPermission';
import { GROUP_ID_TOURIST } from '../const';
import { getSettingValue } from '../../../models/Settings';
import dayjs = require('dayjs');
import ReqLog, { ReqLogger } from '../decorators/ReqLog';
import { getCategoryById } from '../../../models/Category';
import { noop } from 'lodash';
import CurrentDomain from '../decorators/CurrentDomain';
import { insertUserMessage } from '../../../models/UserMessage';
import { markdownToPureText } from '../../../utils/md-to-pure-text';

@JsonController('/posts')
export default class PostController {
  /** 点赞一个评论 */
  @Post('/setLike')
  async setLike(
    @ReqLog('user_like_post.json.log') userLikePostLogger: ReqLogger,
    @CurrentUser({ required: true }) currentUser: User,
    @CurrentDB() db: Sequelize,
    @BodyParam('post_id', { required: true }) postId: number,
    @BodyParam('is_like', { required: true }) isLike: boolean,
  ) {
    const post = await getPost(db, postId);
    if (post == null) throw new UIError('评论未找到');
    const thread = await getThread(db, post.thread_id);
    if (thread == null) throw new UIError('帖子未找到');
    if (!(await currentUser.hasOneOfPermissions('thread.likePosts', `category${thread.category_id}.thread.likePosts`))) {
      throw new UIError('无权限点赞');
    }
    await setUserLikePost(db, post, currentUser.id, isLike);
    userLikePostLogger.log({ postId, isLike });
    return true;
  }

  /**
   * 置顶一条评论
   */
  @Post('/setSticky')
  async setSticky(
    @ReqLog('user_sticky_post.json.log') userStickyThreadLogger: ReqLogger,
    @CurrentUser({ required: true }) currentUser: User,
    @CurrentDB() db: Sequelize,
    @BodyParam('post_id', { required: true }) postId: number,
    @BodyParam('is_sticky', { required: true }) isSticky: boolean,
  ) {
    const post = await getPost(db, postId);
    if (!post) throw new UIError('评论未找到');
    if (post.is_comment) throw new UIError('评论的回复不能置顶');
    if (post.is_first) throw new UIError('仅帖子评论可置顶');

    const thread = await getThread(db, post.thread_id);
    if (!(await currentUser.isAdmin()) && currentUser.id !== thread.user_id) {
      throw new UIError('不能置顶他人帖子评论');
    }

    const hasPermission =
      (await currentUser.hasPermission('thread.stickyOwnThreadPost')) ||
      (await currentUser.hasPermission(`category${thread.category_id}.thread.stickyOwnThreadPost`));
    if (!hasPermission) throw new UIError('无权置顶');
    if (post.deleted_at) throw new UIError('评论已被删除');
    if (thread.deleted_at) throw new UIError('帖子已被删除');

    post.is_sticky = isSticky;
    await post.save();
    userStickyThreadLogger.log({ isSticky, threadId: thread.id, postId });
    return true;
  }

  /** 查询帖子的评论列表 */
  @Get('/list')
  async listPosts(
    @Req() request: Request,
    @ReqLog('user_list_post.json.log') userListPostLogger: ReqLogger,
    @CurrentUser() currentUser: User,
    @CurrentDB() db: Sequelize,
    @QueryParam('thread_id') threadId: number,
    @QueryParam('user_id') userId: number,
    @QueryParam('keywords') keywords: string,
    @QueryParam('page_offset') offset = 0,
    @QueryParam('page_limit') limit = 20,
    @QueryParam('sort') sort: string, // [keyof Post | `-${keyof Post}`].join(',')
  ) {
    if (!threadId && !userId && !(await currentUser.isAdmin())) {
      throw new UIError('无权限查看全站评论');
    }
    if (threadId) {
      const thread = await getThread(db, threadId);
      if (thread == null) throw new UIError('帖子未找到');
      // 帖子评论关闭 检查
      if (thread.disable_post) throw new UIError('当前帖子已关闭评论功能');
      if (thread.disable_post === null) {
        const category = await getCategoryById(db, thread.category_id);
        if (category.disable_post) {
          throw new UIError('当前板块已关闭评论功能');
        }
      }
      // 用户查看评论权限 检查
      const hasPermission = currentUser
        ? await currentUser.hasOneOfPermissions('thread.viewPosts', `category${thread.category_id}.thread.viewPosts`)
        : await hasOneOfPermissions(db, GROUP_ID_TOURIST, 'thread.viewPosts', `category${thread.category_id}.thread.viewPosts`);
      if (!hasPermission) {
        throw new UIError('无权限查看评论');
      }
    }
    if (!threadId && userId && userId !== currentUser?.id) {
      const aimUser = await getUser(db, userId);
      if (!aimUser) throw new UIError('指定用户未找到');
      // 权限检查：查看指定用户所有评论
      const currentUserHasPermission = currentUser
        ? await currentUser.hasPermission('user.view.posts')
        : await hasPermission(db, GROUP_ID_TOURIST, 'user.view.posts');
      if (!currentUserHasPermission) {
        throw new UIError('无权限查看指定用户的所有评论');
      }
    }

    const PostModel = await getPostModel(db);
    const whereOption: WhereOptions<Partial<PostClass>> = {
      ...(threadId ? { thread_id: threadId } : {}),
      ...(userId ? { user_id: userId } : {}),
      ...(keywords
        ? {
            content: {
              [Op.like]: `%${keywords}%`,
            },
          }
        : {}),
      is_first: false,
      is_approved: true,
      is_comment: false,
    };
    const posts = await PostModel.findAll({
      where: whereOption,
      order: `${threadId ? '-is_sticky,' : ''}${sort || 'created_at'}`
        .split(',')
        .filter(Boolean)
        .map((o) => {
          if (o[0] === '-') {
            return [o.substring(1), 'DESC'];
          }
          return [o];
        }) as any,
      limit,
      offset,
    });

    const list = await Promise.all(posts.map((m) => m.toViewJSON(currentUser)));
    list[WrapDataExtraKey] = {
      totalCount: await PostModel.count({ where: whereOption }),
    };
    userListPostLogger.log({ userId, threadId, offset, limit, sort });
    return list;
  }

  /** 查询评论的回复列表 */
  @Get('/listComments')
  async listComments(
    @Req() request: Request,
    @ReqLog('user_list_comment.json.log') userListCommentLogger: ReqLogger,
    @CurrentUser() currentUser: User,
    @CurrentDB() db: Sequelize,
    @QueryParam('post_id') postId: number,
    @QueryParam('user_id') userId: number,
    @QueryParam('keywords') keywords: string,
    @QueryParam('page_offset') offset = 0,
    @QueryParam('page_limit') limit = 20,
    @QueryParam('sort') sort: string, // [keyof Post | `-${keyof Post}`].join(',')
  ) {
    if (!postId && !userId && !(await currentUser.isAdmin())) {
      throw new UIError('无权限查看全站回复');
    }
    if (!postId && userId && userId !== currentUser?.id) {
      const aimUser = await getUser(db, userId);
      if (!aimUser) throw new UIError('指定用户未找到');
      // 权限检查：查看指定用户所有评论
      const currentUserHasPermission = currentUser
        ? await currentUser.hasPermission('user.view.posts')
        : await hasPermission(db, GROUP_ID_TOURIST, 'user.view.posts');
      if (!currentUserHasPermission) {
        throw new UIError('无权限查看指定用户的所有回复');
      }
    }
    const PostModel = await getPostModel(db);
    const whereOption: WhereOptions<Partial<PostClass>> = {
      ...(postId ? { reply_post_id: postId } : {}),
      ...(userId ? { user_id: userId } : {}),
      ...(keywords
        ? {
            content: {
              [Op.like]: `%${keywords}%`,
            },
          }
        : {}),
      is_first: false,
      is_approved: true,
      is_comment: true,
    };
    const posts = await PostModel.findAll({
      where: whereOption,
      order: `${sort || 'created_at'}`
        .split(',')
        .filter(Boolean)
        .map((o) => {
          if (o[0] === '-') {
            return [o.substring(1), 'DESC'];
          }
          return [o];
        }) as any,
      limit,
      offset,
    });

    const list = await Promise.all(posts.map((m) => m.toViewJSON(currentUser)));
    list[WrapDataExtraKey] = {
      totalCount: await PostModel.count({ where: whereOption }),
    };
    userListCommentLogger.log({ postId, userId, offset, limit, sort });
    return list;
  }

  @Get('/checkCanCreate')
  async checkCanCreateAPI(
    @CurrentUser({ required: true }) currentUser: User,
    @CurrentDB() db: Sequelize,
    @QueryParam('thread_id', { required: true }) threadId: number,
  ) {
    const thread = await getThread(db, threadId);
    if (thread == null) throw new UIError('帖子未找到');
    return PostController.checkCanCreatePostImpl(currentUser, thread);
  }

  /**
   * 创建一条帖子的评论
   */
  @Post('/create')
  async create(
    @Req() request: Request,
    @ReqLog('user_create_post.json.log') userCreatePostLogger: ReqLogger,
    @CurrentUser({ required: true }) currentUser: User,
    @CurrentDB() db: Sequelize,
    @CurrentDomain() dbName: string,
    @BodyParam('thread_id', { required: true }) threadId: number,
    @BodyParam('content', { required: true }) content: string,
  ) {
    const thread = await getThread(db, threadId);
    if (thread == null) throw new UIError('帖子未找到');
    const threadFirstPost = await getPost(db, thread.first_post_id);
    if (threadFirstPost == null) throw new UIError('帖子内容未找到');

    const checkResult = await PostController.checkCanCreatePostImpl(currentUser, thread);
    if (!checkResult.canCreate) {
      throw new UIError(checkResult.cantCreateReason || '校验失败');
    }

    const PostModel = await getPostModel(db);
    const post = await PostModel.create({
      thread_id: threadId,
      user_id: currentUser.id,
      ip: formatReqIP(request.ip),
      is_first: false,
      is_comment: false,
      is_approved: true,
      content,
    });
    await threadFirstPost.updatePostReplyCount();

    await currentUser.updatePostCount();
    thread.posted_at = new Date();
    await thread.save();

    userCreatePostLogger.log({
      threadId,
      contentLength: content.length,
      content: formatSubString(content, 100),
      userAgent: request.headers?.['user-agent'],
    });

    if (currentUser.id !== thread.user_id) {
      insertUserMessage(db, {
        title: `你的帖子"${formatSubString(thread.title, 15)}"有了新的评论`,
        content: `用户"${formatSubString(currentUser.nickname, 15)}"回复了你的帖子：
${formatSubString(markdownToPureText(content), 20)}`,
        link: `/#/thread/detail/${thread.id}`,
        user_id: thread.user_id,
        from_user_id: currentUser.id,
        unread_merge_key: `viewThread${thread.id}`,
      }).catch(noop);
    }

    return post.toViewJSON(currentUser);
  }

  /**
   * 创建一条评论的回复
   */
  @Post('/createComment')
  async createComment(
    @Req() request: Request,
    @ReqLog('user_create_comment.json.log') userCreateCommentLogger: ReqLogger,
    @CurrentUser({ required: true }) currentUser: User,
    @CurrentDB() db: Sequelize,
    @CurrentDomain() dbName: string,
    @BodyParam('post_id', { required: true }) postId: number,
    @BodyParam('comment_post_id') commentPostId: number,
    @BodyParam('content', { required: true }) content: string,
  ) {
    const post = await getPost(db, postId);
    if (post == null) throw new UIError('评论未找到');
    const thread = await getThread(db, post.thread_id);
    if (thread == null) throw new UIError('帖子未找到');
    const replyCommentPost = commentPostId ? await getPost(db, commentPostId) : null;

    const checkResult = await PostController.checkCanCreatePostImpl(currentUser, thread);
    if (!checkResult.canCreate) {
      throw new UIError(checkResult.cantCreateReason || '校验失败');
    }
    const PostModel = await getPostModel(db);
    const newCommentPost = await PostModel.create({
      thread_id: thread.id,
      user_id: currentUser.id,
      reply_post_id: postId,
      reply_user_id: post.user_id,
      comment_post_id: replyCommentPost ? replyCommentPost.id : null,
      comment_user_id: replyCommentPost ? replyCommentPost.user_id : null,
      ip: formatReqIP(request.ip),
      is_first: false,
      is_comment: true,
      is_approved: true,
      content,
    });
    await post.updatePostReplyCount();
    thread.posted_at = new Date();
    await thread.save();
    userCreateCommentLogger.log({ postId, commentPostId, contentLength: content.length, content: formatSubString(content, 100) });

    const hasNotifyUserIds = new Set<number>();

    // 通知评论所属用户
    if (currentUser.id !== post.user_id) {
      hasNotifyUserIds.add(post.user_id);
      insertUserMessage(db, {
        title: `你的评论"${formatSubString(markdownToPureText(post.content), 10)}"有了新的回复`,
        content: `用户"${formatSubString(currentUser.nickname, 15)}"回复了你的评论:
${formatSubString(content, 20)}`,
        link: `/#/thread/detail/${thread.id}`,
        user_id: post.user_id,
        from_user_id: currentUser.id,
        unread_merge_key: `viewThread${thread.id}.post${post.id}`,
      }).catch(noop);
    }

    // 通知回复目户
    if (commentPostId && currentUser.id !== replyCommentPost.user_id && !hasNotifyUserIds.has(replyCommentPost.user_id)) {
      hasNotifyUserIds.add(replyCommentPost.user_id);
      // 指定了目标回复
      insertUserMessage(db, {
        title: `你的回复"${formatSubString(markdownToPureText(replyCommentPost.content), 10)}"有了新的回复`,
        content: `用户"${formatSubString(currentUser.nickname, 15)}"回复了你的回复:
${formatSubString(content, 20)}`,
        link: `/#/thread/detail/${thread.id}`,
        user_id: replyCommentPost.user_id,
        from_user_id: currentUser.id,
        unread_merge_key: `viewThread${thread.id}.post${post.id}`,
      }).catch(noop);
    }

    // 通知楼主
    if (currentUser.id !== thread.user_id && !hasNotifyUserIds.has(thread.user_id)) {
      hasNotifyUserIds.add(thread.user_id);
      insertUserMessage(db, {
        title: `你的帖子"${formatSubString(thread.title, 15)}"有了新的回复`,
        content: `用户"${formatSubString(currentUser.nickname, 15)}"回复了你帖子里的评论：\n
${formatSubString(markdownToPureText(content), 20)}`,
        link: `/#/thread/detail/${thread.id}`,
        user_id: thread.user_id,
        from_user_id: currentUser.id,
        unread_merge_key: `viewThread${thread.id}`,
      }).catch(noop);
    }

    return newCommentPost.toViewJSON(currentUser);
  }

  /** 批量删除 评论/回复 */
  @Post('/batchDeletePosts')
  async batchDeletePosts(
    @ReqLog('user_delete_post.json.log') userDeletePostLogger: ReqLogger,
    @CurrentUser({ required: true }) currentUser: User,
    @CurrentDB() db: Sequelize,
    @BodyParam('ids') ids: string,
  ) {
    const posts = (
      await Promise.all(
        ids
          .split(',')
          .filter(Boolean)
          .map((id) => getPost(db, parseInt(id))),
      )
    ).filter(Boolean);
    const result = {
      sucIds: [] as number[],
      failIds: [] as number[],
    };
    for (const post of posts) {
      try {
        if (await post.canHideByUser(currentUser)) {
          await post.delete();
          result.sucIds.push(post.id);
          userDeletePostLogger.log({ postId: post.id });
        } else {
          result.failIds.push(post.id);
        }
      } catch (e) {
        result.failIds.push(post.id);
      }
    }
    if (result.sucIds.length === 0 && result.failIds.length > 0) {
      throw new UIError('删除失败');
    }
    return result;
  }

  /** 获取一条 评论/回复 详情 */
  @Get('/:id')
  async get(@CurrentUser() currentUser: User, @CurrentDB() db: Sequelize, @Param('id') id: number) {
    const post = await getPost(db, id);
    if (post == null) throw new UIError('未找到');
    return post.toViewJSON(currentUser);
  }

  /** 修改一条评论/回复 */
  @Post('/:id')
  async modify(
    @ReqLog('user_edit_post.json.log') userEditPostLogger: ReqLogger,
    @CurrentUser({ required: true }) currentUser: User,
    @CurrentDB() db: Sequelize,
    @Req() request: Request,
    @Param('id') id: number,
    @BodyParam('content', { required: true }) content: string,
  ) {
    const post = await getPost(db, id);
    if (post == null) throw new UIError('未找到');
    if (!(await post.canEditByUser(currentUser))) {
      throw new UIError('无权修改');
    }
    post.content = content;
    if (currentUser.id == post.user_id) {
      // 修改评论/回复更新 ip
      post.ip = formatReqIP(request.ip);
    }
    await post.save();
    userEditPostLogger.log({ postId: id, contentLength: content.length, content: content.substr(0, 100) });
    return post.toViewJSON(currentUser);
  }

  /** 删除一条评论/回复 */
  @Delete('/:id')
  async delete(
    @ReqLog('user_delete_post.json.log') userDeletePostLogger: ReqLogger,
    @CurrentUser({ required: true }) currentUser: User,
    @CurrentDB() db: Sequelize,
    @Param('id') id: number,
  ) {
    const post = await getPost(db, id);
    if (post == null) throw new UIError('未找到');
    if (!(await post.canHideByUser(currentUser))) {
      throw new UIError('无权删除');
    }
    await post.delete();

    userDeletePostLogger.log({ postId: id });
    return true;
  }

  private static async checkCanCreatePostImpl(currentUser: User, thread: Thread) {
    if (!currentUser) throw new UnauthorizedError('未登录');
    const db: Sequelize = currentUser.sequelize;
    let canCreate = true;
    let cantCreateReason: string;

    // 用户状态检查
    if (currentUser.status !== UserStatus.Normal) {
      canCreate = false;
      cantCreateReason = '用户状态异常，无法评论';
      if (
        currentUser.status === UserStatus.Checking ||
        currentUser.status === UserStatus.CheckFail ||
        currentUser.status === UserStatus.CheckIgnore
      ) {
        cantCreateReason = '用户审核未通过，无法评论';
      } else if (currentUser.status === UserStatus.Disabled) {
        cantCreateReason = '用户已禁用，无法评论';
      }
    }

    // 用户角色权限检查
    if (canCreate) {
      const hasPermission =
        (await currentUser.hasPermission('thread.reply')) ||
        (await currentUser.hasPermission(`category${thread.category_id}.thread.reply`));
      if (!hasPermission) {
        canCreate = false;
        cantCreateReason = '无权评论/回复';
      }
    }

    // 新注册用户禁止评论检查
    if (canCreate) {
      const replyThreadJoinInDays = parseInt(await getSettingValue(db, 'reply_thread_join_in_days')) || 0;
      if (replyThreadJoinInDays > 0 && currentUser.created_at?.getTime() && !(await currentUser.isAdmin())) {
        const canCreateTime = currentUser.created_at.getTime() + replyThreadJoinInDays * 24 * 60 * 60 * 1000;
        if (canCreateTime > Date.now()) {
          canCreate = false;
          cantCreateReason = `新注册用户 ${replyThreadJoinInDays} 天内不允许评论，请在 ${dayjs(canCreateTime).format(
            'YYYY-MM-DD HH:mm:ss',
          )} 后再试`;
        }
      }
    }

    // 短时间评论/回复频率过快拦截
    if (canCreate && !(await currentUser.isAdmin())) {
      const createdPostsCountIn3Mins = await getUserCreatePostCountInTimes(db, currentUser.id, [Date.now() - 3 * 60 * 1000, Date.now()]);
      if (createdPostsCountIn3Mins >= 15) {
        // 3分钟内 限制最多评论/回复 15 条
        canCreate = false;
        cantCreateReason = '回复频率过快，请稍后再试';
      } else {
        const createdPostsCountIn20Mins = await getUserCreatePostCountInTimes(db, currentUser.id, [
          Date.now() - 20 * 60 * 1000,
          Date.now(),
        ]);
        if (createdPostsCountIn20Mins >= 50) {
          // 20分钟 限制最多评论/回复 50条
          canCreate = false;
          cantCreateReason = '回复频率过快，请稍后再试';
        }
      }
    }

    if (canCreate) {
      if (thread.disable_post) {
        canCreate = false;
        cantCreateReason = '当前帖子已关闭评论功能';
      } else if (thread.disable_post === null) {
        const category = await getCategoryById(db, thread.category_id);
        if (category.disable_post) {
          canCreate = false;
          cantCreateReason = '当前板块已关闭评论功能';
        }
      }
    }

    return {
      canCreate,
      cantCreateReason,
    };
  }
}
