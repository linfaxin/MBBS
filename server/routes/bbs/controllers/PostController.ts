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
import { formatReqIP } from '../../../utils/format-utils';
import UIError from '../../../utils/ui-error';
import { hasOneOfPermissions } from '../../../models/GroupPermission';
import { GROUP_ID_TOURIST } from '../const';
import { getSettingValue } from '../../../models/Settings';
import dayjs = require('dayjs');
import ReqLog, { ReqLogger } from '../decorators/ReqLog';
import { getCategoryById } from '../../../models/Category';
import { mailToUser } from '../../../utils/mail-util';
import { noop } from 'lodash';
import { getDefaultHost } from '../../../utils/bind-host-util';
import CurrentDomain from '../decorators/CurrentDomain';

@JsonController('/posts')
export default class PostController {
  private async updatePostReplyCount(post: PostClass) {
    const PostModel = await getPostModel(post.sequelize);
    if (post.is_first) {
      // 是帖子评论
      post.reply_count = await PostModel.count({
        where: {
          thread_id: post.thread_id,
          is_first: false,
          is_approved: true,
          is_comment: false,
        },
      });
      // 同时更新 thread 的 post_count
      const thread = await getThread(post.sequelize, post.thread_id);
      thread.post_count = post.reply_count;
      await thread.save();
    } else {
      // 是评论回复
      post.reply_count = await PostModel.count({
        where: {
          reply_post_id: post.id,
          is_first: false,
          is_approved: true,
          is_comment: true,
        },
      });
    }
    await post.save();
  }

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
    if (threadId) {
      const thread = await getThread(db, threadId);
      if (thread == null) throw new UIError('帖子未找到');
      const hasPermission = currentUser
        ? await currentUser.hasOneOfPermissions('thread.viewPosts', `category${thread.category_id}.thread.viewPosts`)
        : await hasOneOfPermissions(db, GROUP_ID_TOURIST, 'thread.viewPosts', `category${thread.category_id}.thread.viewPosts`);
      if (!hasPermission) {
        throw new UIError('无权限查看评论');
      }
      if (thread.disable_post) throw new UIError('当前帖子已关闭评论功能');
      if (thread.disable_post === null) {
        const category = await getCategoryById(db, thread.category_id);
        if (category.disable_post) {
          throw new UIError('当前板块已关闭评论功能');
        }
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
    await this.updatePostReplyCount(threadFirstPost);

    await currentUser.updatePostCount();
    thread.posted_at = new Date();
    await thread.save();

    userCreatePostLogger.log({
      threadId,
      contentLength: content.length,
      content: content.substr(0, 100),
      userAgent: request.headers?.['user-agent'],
    });

    if (currentUser.id !== thread.user_id) {
      mailToUser({
        db,
        mailKey: `viewThread${thread.id}`,
        userId: thread.user_id,
        title: '你的帖子有了新的回复',
        htmlBody: `用户 ${currentUser.nickname} 回复了你的帖子（${thread.title}）<br/><br/><a href='http://${await getDefaultHost(
          dbName,
        )}/#/thread/detail/${thread.id}'>点击查看</a>`,
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
    await this.updatePostReplyCount(post);
    thread.posted_at = new Date();
    await thread.save();
    userCreateCommentLogger.log({ postId, commentPostId, contentLength: content.length, content: content.substr(0, 100) });

    if (currentUser.id !== post.user_id) {
      mailToUser({
        db,
        mailKey: `viewThread${thread.id}`,
        userId: post.user_id,
        title: '你的评论有了新的回复',
        htmlBody: `用户 ${currentUser.nickname} 回复了你的评论<br/><br/><a href='http://${await getDefaultHost(dbName)}/#/thread/detail/${
          thread.id
        }'>点击查看</a>`,
      }).catch(noop);
    }

    if (commentPostId && currentUser.id !== commentPostId && commentPostId !== post.user_id) {
      // 指定了目标回复
      mailToUser({
        db,
        mailKey: `viewThread${thread.id}`,
        userId: commentPostId,
        title: '你的回复有了新的回复',
        htmlBody: `用户 ${currentUser.nickname} 回复了你的回复<br/><br/><a href="http://${await getDefaultHost(dbName)}/#/thread/detail/${
          thread.id
        }">点击查看</a>`,
      }).catch(noop);
    }

    return newCommentPost.toViewJSON(currentUser);
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
    await post.destroy();

    if (post.reply_post_id && post.is_comment) {
      const replyPost = await getPost(db, post.reply_post_id);
      if (replyPost) {
        await this.updatePostReplyCount(replyPost);
      }
    } else {
      const thread = await getThread(db, post.thread_id);
      const threadFirstPost = await getPost(db, thread.first_post_id);
      if (threadFirstPost) {
        await this.updatePostReplyCount(threadFirstPost);
      }

      // 更新用户回复数量
      const postUser = await getUser(db, post.user_id);
      await postUser.updatePostCount();
    }

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
      if (createdPostsCountIn3Mins >= 20) {
        // 3分钟内 限制最多评论/回复 20条
        canCreate = false;
        cantCreateReason = '回复频率过快，请稍后再试';
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
