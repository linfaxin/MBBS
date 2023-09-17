import { BodyParam, Delete, Get, JsonController, Param, Post, QueryParam, Req, UnauthorizedError } from 'routing-controllers';
import { noop } from 'lodash';
import * as LRUCache from 'lru-cache';
import CurrentDB from '../decorators/CurrentDB';
import { getUser, getUserByName, User, UserStatus } from '../../../models/User';
import { Op, Sequelize, WhereOptions } from 'sequelize';
import CurrentUser from '../decorators/CurrentUser';
import { getGroupPermissions, hasPermission } from '../../../models/GroupPermission';
import {
  getThread,
  getThreadModel,
  getUserCreateThreadCountInTimes,
  getUserTodayCreateCount,
  NormalThreadFilter,
  Thread,
  ThreadIsApproved,
} from '../../../models/Thread';
import { GROUP_ID_TOURIST } from '../const';
import { setUserLikePost } from '../../../models/LikePostUser';
import { getPost, getPostModel } from '../../../models/Post';
import { getCategoryById, getCategoryModel, updateCategoryThreadCount } from '../../../models/Category';
import { getCreateThreadDailyLimit, getSettingValue, setSettingValue } from '../../../models/Settings';
import { Request } from 'express';
import { formatReqIP, formatSubString } from '../../../utils/format-utils';
import { WrapDataExtraKey } from '../global-interceptors/WrapDataInterceptors';
import UIError from '../../../utils/ui-error';
import ReqLog, { ReqLogger } from '../decorators/ReqLog';
import { markdownHasReplyHiddenContent, markdownToPureText } from '../../../utils/md-to-pure-text';
import CurrentDomain from '../decorators/CurrentDomain';
import { getDBNameFromDB } from '../../../models/db';
import { isDevEnv } from '../../../utils/env-util';
import { insertUserMessage } from '../../../models/UserMessage';

import moment = require('moment');
import dayjs = require('dayjs');

const viewThreadIdCache = new LRUCache<string, true>({
  // <dbName/threadId/ip或userId, true>
  max: 10000,
  maxAge: 60 * 60 * 1000,
});

@JsonController('/threads')
export default class ThreadController {
  @Post('/setLike')
  async setLike(
    @ReqLog('user_like_thread.json.log') userLikeThreadLogger: ReqLogger,
    @CurrentUser({ required: true }) currentUser: User,
    @CurrentDB() db: Sequelize,
    @BodyParam('thread_id', { required: true }) threadId: number,
    @BodyParam('is_like', { required: true }) isLike: boolean,
  ) {
    // 数据校验
    const thread = await getThread(db, threadId);
    if (thread == null) throw new UIError('帖子未找到');
    const firstPost = await getPost(db, thread.first_post_id);
    if (firstPost == null) throw new UIError('帖子内容未找到');
    if (!(await currentUser.hasOneOfPermissions('thread.like', `category${thread.category_id}.thread.like`))) {
      throw new UIError('无权限点赞');
    }
    if (thread.deleted_at) throw new UIError('帖子已被删除');

    // 数据处理
    await setUserLikePost(db, firstPost, currentUser.id, isLike);
    userLikeThreadLogger.log({ isLike, threadId, title: thread.title });
    return true;
  }

  @Post('/setSticky')
  async setSticky(
    @ReqLog('user_sticky_thread.json.log') userStickyThreadLogger: ReqLogger,
    @CurrentUser({ required: true }) currentUser: User,
    @CurrentDB() db: Sequelize,
    @BodyParam('thread_id', { required: true }) threadId: number,
    @BodyParam('is_sticky', { required: true }) isSticky: boolean,
    @BodyParam('sticky_at_other_categories') sticky_at_other_categories: string,
  ) {
    const thread = await getThread(db, threadId);
    if (thread == null) throw new UIError('帖子未找到');
    if (thread.deleted_at) throw new UIError('帖子已被删除');

    const hasPermission = await currentUser.hasOneOfPermissions('thread.sticky', `category${thread.category_id}.thread.sticky`);
    if (!hasPermission) throw new UIError('无权在当前板块置顶');

    for (const otherCategoryId of (sticky_at_other_categories || '').split(',').map((id) => parseInt(id))) {
      if (!(await currentUser.hasOneOfPermissions('thread.sticky', `category${otherCategoryId}.thread.sticky`))) {
        throw new UIError(`无权置顶至板块"${(await getCategoryById(db, otherCategoryId)).name}"`);
      }
    }

    thread.is_sticky = isSticky;
    thread.sticky_at_other_categories = isSticky ? sticky_at_other_categories || null : null;
    await thread.save();
    userStickyThreadLogger.log({ isSticky, threadId });
    return true;
  }

  @Post('/setEssence')
  async setEssence(
    @ReqLog('user_essence_thread.json.log') userEssenceThreadLogger: ReqLogger,
    @CurrentUser({ required: true }) currentUser: User,
    @CurrentDB() db: Sequelize,
    @BodyParam('thread_id', { required: true }) threadId: number,
    @BodyParam('is_essence', { required: true }) isEssence: boolean,
  ) {
    const thread = await getThread(db, threadId);
    if (thread == null) throw new UIError('帖子未找到');
    const hasPermission =
      (await currentUser.hasPermission('thread.essence')) ||
      (await currentUser.hasPermission(`category${thread.category_id}.thread.essence`));
    if (!hasPermission) throw new UIError('无权设置精华');
    if (thread.deleted_at) throw new UIError('帖子已被删除');

    thread.is_essence = isEssence;
    await thread.save();
    userEssenceThreadLogger.log({ isEssence, threadId });
    return true;
  }

  @Post('/setApproved')
  async setApproved(
    @ReqLog('user_approved_thread.json.log') userApprovedThreadLogger: ReqLogger,
    @CurrentUser({ required: true }) currentUser: User,
    @CurrentDB() db: Sequelize,
    @BodyParam('thread_id', { required: true }) threadId: number,
    @BodyParam('is_approved', { required: true }) isApproved: ThreadIsApproved,
  ) {
    if (!(await currentUser.isAdmin())) throw new UIError('无权修改');
    const thread = await getThread(db, threadId);
    if (thread == null) throw new UIError('帖子未找到');

    thread.is_approved = isApproved;
    await thread.saveAndUpdateThreadCount();
    userApprovedThreadLogger.log({ isApproved, threadId });
    return true;
  }

  @Post('/setDisablePost')
  async setDisablePost(
    @CurrentUser({ required: true }) currentUser: User,
    @CurrentDB() db: Sequelize,
    @BodyParam('thread_id', { required: true }) threadId: number,
    @BodyParam('disable_post') disablePost: boolean | null,
  ) {
    if (!(await currentUser.isAdmin())) throw new UIError('无权修改');
    const thread = await getThread(db, threadId);
    if (thread == null) throw new UIError('帖子未找到');

    thread.disable_post = disablePost;
    await thread.save();
    return true;
  }

  @Post('/checkCanCreate')
  async checkCanCreateAPI(
    @CurrentUser({ required: true }) currentUser: User,
    @CurrentDB() db: Sequelize,
    @BodyParam('category_id', { required: true }) categoryId: number,
  ) {
    return ThreadController.checkCanCreateThreadImpl(currentUser, categoryId);
  }

  private static async checkCanCreateThreadImpl(currentUser: User, categoryId: number, content?: string) {
    if (!currentUser) throw new UIError('未登录');
    const db: Sequelize = currentUser.sequelize;
    let canCreate = true;
    let cantCreateReason: string;

    // 用户状态检查
    if (currentUser.status !== UserStatus.Normal) {
      canCreate = false;
      cantCreateReason = '用户状态异常，无法发帖';
      if (
        currentUser.status === UserStatus.Checking ||
        currentUser.status === UserStatus.CheckFail ||
        currentUser.status === UserStatus.CheckIgnore
      ) {
        cantCreateReason = '用户审核未通过，无法发帖';
      } else if (currentUser.status === UserStatus.Disabled) {
        cantCreateReason = '用户已禁用，无法发帖';
      }
    }

    // 用户角色 发帖权限
    if (canCreate) {
      const hasPermission =
        (await currentUser.hasPermission('createThread')) || (await currentUser.hasPermission(`category${categoryId}.createThread`));
      if (!hasPermission) {
        canCreate = false;
        cantCreateReason = '无权发帖';
      }
    }

    // 新注册用户 禁止发帖检查
    if (canCreate && !(await currentUser.isAdmin())) {
      const createThreadJoinInDays = parseInt(await getSettingValue(db, 'create_thread_join_in_days')) || 0;
      if (createThreadJoinInDays > 0 && currentUser.created_at?.getTime() && !(await currentUser.isAdmin())) {
        const canCreateTime = currentUser.created_at.getTime() + createThreadJoinInDays * 24 * 60 * 60 * 1000;
        if (canCreateTime > Date.now()) {
          canCreate = false;
          cantCreateReason = `新注册用户 ${createThreadJoinInDays} 天内不允许发帖，请在 ${dayjs(canCreateTime).format(
            'YYYY-MM-DD HH:mm:ss',
          )} 后再试`;
        }
      }
    }

    // 每日发帖量检查
    const todayCreateCount = await getUserTodayCreateCount(db, currentUser.id);
    const siteCreateLimit = parseInt(await getSettingValue(db, 'person_daily_create_thread'));
    if (canCreate && siteCreateLimit && !(await currentUser.isAdmin())) {
      if (todayCreateCount >= siteCreateLimit) {
        canCreate = false;
        cantCreateReason = `今天发帖量已达上限（${siteCreateLimit}条）`;
      }
    }

    // 每日发帖量检查（当前板块）
    const categoryCreateLimit = await getCreateThreadDailyLimit(db, categoryId);
    if (canCreate && categoryCreateLimit && !(await currentUser.isAdmin())) {
      const categoryTodayCreateCount = await getUserTodayCreateCount(db, currentUser.id, categoryId);
      if (categoryTodayCreateCount >= categoryCreateLimit) {
        canCreate = false;
        cantCreateReason = `在该分类版块今天发帖量已达上限（${categoryCreateLimit}条）`;
      }
    }

    // 短时间发帖频率过快拦截
    if (canCreate && !(await currentUser.isAdmin()) && !isDevEnv()) {
      const createdThreadCountIn3Mins = await getUserCreateThreadCountInTimes(db, currentUser.id, [Date.now() - 3 * 60 * 1000, Date.now()]);
      if (createdThreadCountIn3Mins >= 3) {
        // 3分钟内 限制最多发帖3个
        canCreate = false;
        cantCreateReason = '发帖频率过快，请稍后再试';
      } else {
        const createdThreadCountIn20Mins = await getUserCreateThreadCountInTimes(db, currentUser.id, [
          Date.now() - 20 * 60 * 1000,
          Date.now(),
        ]);
        if (createdThreadCountIn20Mins >= 10) {
          // 20分钟内 限制最多发帖 10 个
          canCreate = false;
          cantCreateReason = '发帖频率过快，请稍后再试';
        }
      }
    }

    // 帖子包含隐藏内容 & 发隐藏帖权限检查
    if (canCreate && content && markdownHasReplyHiddenContent(content)) {
      const hasPermission =
        (await currentUser.hasPermission('thread.createHiddenContent')) ||
        (await currentUser.hasPermission(`category${categoryId}.thread.createHiddenContent`));
      if (!hasPermission) {
        canCreate = false;
        cantCreateReason = '无权发隐藏内容帖';
      }
    }

    return {
      canCreate,
      cantCreateReason,
      todayCreateCount,
      categoryCreateLimit,
      siteCreateLimit,
    };
  }

  @Post('/restoreDelete')
  async restoreDeleteThread(
    @ReqLog('user_restore_delete_thread.json.log') userRestoreDeleteThreadLogger: ReqLogger,
    @CurrentUser({ required: true }) currentUser: User,
    @CurrentDB() db: Sequelize,
    @QueryParam('thread_id') id: number,
  ) {
    const thread = await getThread(db, id);
    if (thread == null) throw new UIError('帖子未找到');
    if (!(await currentUser.isAdmin())) throw new UIError('无权恢复');

    thread.deleted_user_id = null;
    thread.deleted_at = null;
    await thread.saveAndUpdateThreadCount();

    userRestoreDeleteThreadLogger.log({ threadId: id });
    return true;
  }

  // 新帖邮件通知管理员
  static async newThreadMailNoticeAdmin(currentUser: User, thread: Thread) {
    if (await currentUser.isAdmin()) return;
    if (thread.is_approved !== ThreadIsApproved.ok) return; // 状态异常
    if (thread.is_draft) return; // 草稿无需发送

    const db = currentUser.sequelize;
    const dbName = getDBNameFromDB(db);

    const new_thread_notice_admin_email = await getSettingValue(db, '__internal_new_thread_notice_admin_email');
    const shouldNoticeAdmin =
      new_thread_notice_admin_email === 'all' || (new_thread_notice_admin_email || '').split(',').includes(String(thread.category_id));

    if (!shouldNoticeAdmin) return;

    const category = await getCategoryById(db, thread.category_id);

    insertUserMessage(db, {
      title: `有用户发布了新帖"${formatSubString(thread.title, 10)}"`,
      content: `用户 "${formatSubString(currentUser.nickname, 15)}" 在板块 "${category.name}" 发布了新帖：\n"${formatSubString(
        thread.title,
        15,
      )}"`,
      link: `/#/thread/detail/${thread.id}`,
      user_id: (await getUserByName(db, 'admin')).id,
      from_user_id: thread.user_id,
    }).catch(noop);
  }

  @Post('/create')
  async createThread(
    @ReqLog('user_create_thread.json.log') userCreateThreadLogger: ReqLogger,
    @Req() request: Request,
    @CurrentUser({ required: true }) currentUser: User,
    @CurrentDB() db: Sequelize,
    @CurrentDomain() dbName: string,
    @BodyParam('title', { required: true }) title: string,
    @BodyParam('content', { required: true }) content: string,
    @BodyParam('category_id', { required: true }) categoryId: number,
    @BodyParam('is_draft') isDraft: boolean,
  ) {
    if (isDraft) {
      // 保存草稿 无需检查权限（从草稿发布时再检查）
    } else {
      const checkResult = await ThreadController.checkCanCreateThreadImpl(currentUser, categoryId, content);
      if (!checkResult.canCreate) {
        throw new UIError(checkResult.cantCreateReason || '发帖校验失败');
      }
    }
    if (!title.trim()) throw new UIError('请输入帖子标题');
    if (title.length > 100) throw new UIError('超过帖子标题最大长度(100)');
    if (!content.trim()) throw new UIError('请输入帖子内容');

    const reqIP = formatReqIP(request.ip);
    const PostModel = await getPostModel(db);
    const ThreadModel = await getThreadModel(db);

    const settingValue_create_thread_validate = await getSettingValue(db, 'create_thread_validate');
    const needValidate =
      '1' === settingValue_create_thread_validate ||
      [].concat(JSON.parse(settingValue_create_thread_validate || '[]')).includes(categoryId);

    const createdThread = await db.transaction(async (t) => {
      const thread = await ThreadModel.create(
        {
          user_id: currentUser.id,
          last_posted_user_id: currentUser.id,
          category_id: categoryId,
          is_approved: needValidate ? ThreadIsApproved.checking : ThreadIsApproved.ok,
          is_draft: !!isDraft,
          title,
          content_for_indexes: title + '\n' + markdownToPureText(content),
          post_count: 1,
        },
        { transaction: t },
      );

      const post = await PostModel.create(
        {
          user_id: currentUser.id,
          thread_id: thread.id,
          content,
          ip: reqIP,
          is_first: true,
        },
        { transaction: t },
      );

      thread.first_post_id = post.id;
      await thread.saveAndUpdateThreadCount({ transaction: t });

      return thread;
    });

    userCreateThreadLogger.log({
      threadId: createdThread.id,
      categoryId,
      title,
      isDraft,
      contentLength: content.length,
      content: createdThread.content_for_indexes.substr(0, 100),
      userAgent: request.headers?.['user-agent'],
    });

    if (!isDraft && needValidate && (await getSettingValue(db, '__internal_reviewed_content_notice_admin_email')) === '1') {
      // 新帖需要审核通知管理员
      insertUserMessage(db, {
        title: '有新发布的帖子需要审核',
        content: '点击"查看详情"跳转至审核页',
        link: '/#/manage/thread?is_approved=0',
        user_id: (await getUserByName(db, 'admin')).id,
        from_user_id: currentUser.id,
        unread_merge_key: 'manageThread',
      }).catch(noop);
    }

    if (!isDraft && !needValidate) {
      // 新帖发布 邮件通知管理员
      ThreadController.newThreadMailNoticeAdmin(currentUser, createdThread).catch(noop);
    }

    return createdThread.toViewJSON(currentUser);
  }

  @Get('/listMyDrafts')
  async listMyDrafts(
    @CurrentUser({ required: true }) currentUser: User,
    @CurrentDB() db: Sequelize,
    @QueryParam('category_id') categoryId: number,
  ) {
    const ThreadModel = await getThreadModel(db);
    const whereOption: WhereOptions<Partial<Thread>> = {
      is_draft: true,
      deleted_at: { [Op.is]: null },
      user_id: currentUser.id,
      ...(categoryId ? { category_id: categoryId } : {}),
    };

    const findThreads = await ThreadModel.findAll({
      where: whereOption,
      paranoid: false,
      limit: 100,
    });

    const threads = await Promise.all(findThreads.map((t) => t.toViewJSON(currentUser)));
    const totalCount = await ThreadModel.count({ where: whereOption });
    threads[WrapDataExtraKey] = { totalCount };
    return threads;
  }

  @Get('/list')
  async listThread(
    @ReqLog('user_list_thread.json.log') userListThreadLogger: ReqLogger,
    @CurrentUser() currentUser: User,
    @CurrentDB() db: Sequelize,
    @QueryParam('category_id') categoryId: number,
    @QueryParam('thread_id') threadId: number,
    @QueryParam('user_id') userId: number,
    @QueryParam('keywords') keywords: string,
    @QueryParam('is_essence') isEssence: boolean,
    @QueryParam('is_sticky') isSticky: boolean,
    @QueryParam('is_approved') isApprovedArrStr: string,
    @QueryParam('is_deleted') isDeleted: boolean,
    @QueryParam('created_at_begin') createdAtBegin: string,
    @QueryParam('created_at_end') createdAtEnd: string,
    @QueryParam('page_offset') offset = 0,
    @QueryParam('page_limit') limit = 20,
    @QueryParam('sort') sort: string, // [keyof Thread | `-${keyof Thread}`].join(',')
  ) {
    if (limit > 100) throw new UIError('limit should <= 100');

    const isApprovedArr: ThreadIsApproved[] = (isApprovedArrStr || '')
      .split(',')
      .map((s) => parseInt(s))
      .filter((n) => !isNaN(n));
    // 仅管理员可以查看 审核中/已删除 帖子
    if (isApprovedArr.includes(ThreadIsApproved.checking) || isApprovedArr.includes(ThreadIsApproved.check_failed) || isDeleted) {
      if (!currentUser || !(await currentUser.isAdmin())) {
        throw new UIError('无权查看特殊状态帖子');
      }
    }

    // 仅在有阅读权限的板块内搜索帖子
    const filterInCategoryIds = [] as Array<number>;
    const hasPermissionForCategory = async (categoryId: number) => {
      if (currentUser) {
        // 已登录用户
        return (await currentUser.hasPermission('viewThreads')) || (await currentUser.hasPermission(`category${categoryId}.viewThreads`));
      } else {
        // 游客
        const permissions = await getGroupPermissions(db, GROUP_ID_TOURIST);
        return permissions.includes('viewThreads') || permissions.includes(`category${categoryId}.viewThreads`);
      }
    };
    if (categoryId) {
      // 指定了查看板块，检查是否有权限查看
      if (await hasPermissionForCategory(categoryId)) {
        filterInCategoryIds.push(categoryId);
      }
    } else {
      // 未指定查看板块，找出所有有阅读权限的板块
      const CategoryModel = await getCategoryModel(db);
      for (const category of await CategoryModel.findAll()) {
        if (await hasPermissionForCategory(category.id)) {
          filterInCategoryIds.push(category.id);
        }
      }
    }
    if (!filterInCategoryIds.length) {
      if (!currentUser) throw new UIError('游戏无权查看帖子，请先登录');
      throw new UIError('无权查看帖子');
    }

    if (!categoryId && userId && userId !== currentUser?.id) {
      const aimUser = await getUser(db, userId);
      if (!aimUser) throw new UIError('指定用户未找到');
      // 查看指定用户所有帖子权限 检查
      const currentUserHasPermission = currentUser
        ? await currentUser.hasPermission('user.view.threads')
        : await hasPermission(db, GROUP_ID_TOURIST, 'user.view.threads');
      if (!currentUserHasPermission) {
        throw new UIError('无权限查看指定用户的所有帖子');
      }
    }

    const ThreadModel = await getThreadModel(db);

    const whereOption: WhereOptions<Partial<Thread>> = {
      ...NormalThreadFilter,
      ...(threadId ? { id: threadId } : {}),
      ...(categoryId ? { category_id: categoryId } : {}),
      category_id: {
        [Op.in]: filterInCategoryIds,
      },
      ...(userId ? { user_id: userId } : {}),
      ...(keywords
        ? {
            content_for_indexes: {
              [Op.like]: `%${keywords}%`,
            },
          }
        : {}),
      ...(typeof isEssence === 'boolean' ? { is_essence: isEssence } : {}),
      ...(typeof isSticky === 'boolean' ? { is_sticky: isSticky } : {}),
      is_approved: {
        [Op.in]: isApprovedArr.length ? isApprovedArr : [ThreadIsApproved.ok],
      },
      deleted_at: {
        [isDeleted ? Op.not : Op.is]: null,
      },
      ...(createdAtBegin || createdAtEnd
        ? {
            created_at: {
              ...(createdAtBegin ? { [Op.gte]: moment(createdAtBegin).toDate() } : {}),
              ...(createdAtEnd ? { [Op.lte]: moment(createdAtEnd).toDate() } : {}),
            },
          }
        : {}),
    };

    const order = `${isDeleted ? '' : '-is_sticky,'}${sort || '-posted_at'}`
      .split(',')
      .filter(Boolean)
      .map((o) => {
        if (o[0] === '-') {
          return [o.substring(1), 'DESC'];
        }
        return [o];
      }) as any;

    const findThreads = await ThreadModel.findAll({
      where: whereOption,
      paranoid: false,
      order,
      offset,
      limit,
    });

    const threads = await Promise.all(findThreads.map((t) => t.toViewJSON(currentUser, { field_is_liked: false })));
    const totalCount = await ThreadModel.count({ where: whereOption });
    threads[WrapDataExtraKey] = { totalCount };
    userListThreadLogger.log({
      filter: { categoryId, userId, keywords, isEssence, isSticky, isApprovedArrStr, isDeleted, createdAtBegin, createdAtEnd },
      offset,
      limit,
      sort,
      totalCount,
    });

    if (categoryId && !keywords && !userId && offset === 0) {
      // 板块列表帖子第一页 同时返回 来自其他板块 置顶到当前板块的帖子
      const fromOtherCategoryStickyThreads = await Promise.all(
        (
          await ThreadModel.findAll({
            where: {
              ...NormalThreadFilter,
              category_id: {
                [Op.not]: categoryId,
              },
              is_sticky: true,
              sticky_at_other_categories: {
                [Op.not]: null,
              },
            },
            order,
          })
        )
          .filter((otherThread) => {
            return otherThread.sticky_at_other_categories?.split(',').includes(String(categoryId));
          })
          .map((t) => {
            return t.toViewJSON(currentUser, { field_is_liked: false });
          }),
      );
      threads.unshift(...fromOtherCategoryStickyThreads);
      threads[WrapDataExtraKey] = { totalCount: totalCount + fromOtherCategoryStickyThreads.length };
    }
    return threads;
  }

  @Get('/getForAdmin')
  async getForAdmin(@CurrentUser({ required: true }) currentUser: User, @CurrentDB() db: Sequelize, @QueryParam('id') id: number) {
    const thread = await getThread(db, id);
    if (thread == null) throw new UIError('帖子未找到');
    if (!(await currentUser.isAdmin())) throw new UIError('无权查看');
    return thread.toViewJSON(currentUser);
  }

  @Post('/batchDelete')
  async batchDelete(
    @ReqLog('user_delete_thread.json.log') userDeleteThreadLogger: ReqLogger,
    @CurrentUser({ required: true }) currentUser: User,
    @CurrentDB() db: Sequelize,
    @BodyParam('ids') ids: string,
  ) {
    const threads = (await Promise.all(ids.split(',').map((id) => getThread(db, parseInt(id))))).filter(Boolean);
    const result = {
      sucIds: [] as number[],
      failIds: [] as number[],
    };
    for (const thread of threads) {
      try {
        if (await thread.canDeleteByUser(currentUser)) {
          await thread.deleteByUser(currentUser);
          result.sucIds.push(thread.id);
          userDeleteThreadLogger.log({ threadId: thread.id });
        } else {
          result.failIds.push(thread.id);
        }
      } catch (e) {
        result.failIds.push(thread.id);
      }
    }
    if (result.sucIds.length === 0 && result.failIds.length > 0) {
      throw new UIError('删除失败');
    }
    return result;
  }

  @Get('/:id')
  async getById(
    @ReqLog('user_view_thread.json.log') userViewThreadLogger: ReqLogger,
    @CurrentUser() currentUser: User,
    @CurrentDB() db: Sequelize,
    @CurrentDomain() dbName: string,
    @Req() request: Request,
    @Param('id') id: number,
  ) {
    const thread = await getThread(db, id);
    if (thread == null) throw new UIError('帖子未找到');
    if (thread.deleted_at) {
      throw new UIError('帖子已删除');
    }
    if (thread.is_approved === ThreadIsApproved.checking && currentUser?.id !== thread.user_id) {
      throw new UIError('帖子审核中');
    }
    if (thread.is_approved === ThreadIsApproved.check_failed && currentUser?.id !== thread.user_id) {
      throw new UIError('帖子审核失败');
    }
    if (thread.is_draft && currentUser?.id !== thread.user_id) {
      throw new UIError('帖子编辑草稿中，尚未发布');
    }
    let hasPermission;
    if (currentUser) {
      // 已登录用户
      hasPermission =
        (await currentUser.hasPermission('viewThreads')) || (await currentUser.hasPermission(`category${thread.category_id}.viewThreads`));
    } else {
      // 游客
      const permissions = await getGroupPermissions(db, GROUP_ID_TOURIST);
      hasPermission = permissions.includes('viewThreads') || permissions.includes(`category${thread.category_id}.viewThreads`);
    }
    if (!hasPermission) throw new UIError('无权查看帖子');

    const addViewCountKey = `${dbName}/${thread.id}/${currentUser?.id || formatReqIP(request.ip)}`;
    if (
      thread.user_id !== currentUser?.id && // 非帖子作者/游客
      thread.is_approved === ThreadIsApproved.ok && // 帖子状态正常
      !thread.is_draft && // 帖子非草稿
      !viewThreadIdCache.get(addViewCountKey) // 近期已被当前 用户id/ip 阅读
    ) {
      // 阅读量 + 1 （不阻塞式写入）
      thread.view_count = (thread.view_count || 0) + 1;
      if (!thread.modified_at) thread.modified_at = thread.created_at;
      thread.save(); // 不阻塞式保存
      viewThreadIdCache.set(addViewCountKey, true);
    }

    userViewThreadLogger.log({ threadId: id, title: thread.title });
    return thread.toViewJSON(currentUser);
  }

  @Post('/:id')
  async modifyThread(
    @ReqLog('user_edit_thread.json.log') userEditThreadLogger: ReqLogger,
    @ReqLog('user_create_thread.json.log') userCreateThreadLogger: ReqLogger,
    @CurrentUser({ required: true }) currentUser: User,
    @CurrentDB() db: Sequelize,
    @CurrentDomain() dbName: string,
    @Req() request: Request,
    @Param('id') id: number,
    @BodyParam('title', { required: true }) title: string,
    @BodyParam('content', { required: true }) content: string,
    @BodyParam('category_id', { required: true }) categoryId: number,
    @BodyParam('is_draft') isDraft: boolean,
  ) {
    const thread = await getThread(db, id);
    if (thread == null) throw new UIError('帖子未找到');
    const firstPost = await getPost(db, thread.first_post_id);
    if (firstPost == null) throw new UIError('帖子内容未找到');
    if (!(await getCategoryById(db, categoryId))) throw new UIError('未找到分类');

    if (!title.trim()) throw new UIError('请输入帖子标题');
    if (title.length > 100) throw new UIError('超过帖子标题最大长度(100)');
    if (!content.trim()) throw new UIError('请输入帖子内容');

    if (categoryId !== thread.category_id) {
      // 移动分类需要有 目标分类版块的创建权限
      const checkResult = await ThreadController.checkCanCreateThreadImpl(currentUser, categoryId, content);
      if (!checkResult.canCreate) {
        throw new UIError(`修改分类失败：${checkResult.cantCreateReason || '校验异常'}`);
      }
    }
    if (!(await thread.canEditByUser(currentUser))) {
      throw new UIError('无权修改帖子');
    }

    const publishFromDraft = thread.is_draft && isDraft === false;
    if (publishFromDraft) {
      // 从草稿发布也需要检查创建权限
      const checkResult = await ThreadController.checkCanCreateThreadImpl(currentUser, categoryId, content);
      if (!checkResult.canCreate) {
        throw new UIError(checkResult.cantCreateReason || '校验异常');
      }
      thread.is_draft = false;
    }

    const oldCategory = thread.category_id;
    thread.category_id = categoryId;
    thread.title = title;
    thread.content_for_indexes = title + '\n' + markdownToPureText(content);
    thread.modified_at = new Date();

    // 编辑帖子也需要审核
    const settingValue_create_thread_validate = await getSettingValue(db, 'create_thread_validate');
    let needValidate =
      '1' === settingValue_create_thread_validate ||
      [].concat(JSON.parse(settingValue_create_thread_validate || '[]')).includes(categoryId);

    const managePermission = await currentUser.hasOneOfPermissions('thread.edit', `category${thread.category_id}.thread.edit`);
    if (managePermission) {
      // 有全局编辑帖子权限，则无需审核
      needValidate = false;
    }

    if (needValidate) {
      thread.is_approved = ThreadIsApproved.checking;
    } else {
      thread.is_approved = ThreadIsApproved.ok;
    }

    if (publishFromDraft) {
      // 从草稿发布
      thread.setDataValue('created_at', new Date()); // 设置帖子创建时间
      thread.setDataValue('posted_at', new Date()); // 设置帖子创建时间
      await thread.saveAndUpdateThreadCount();

      userCreateThreadLogger.log({
        threadId: thread.id,
        categoryId,
        title,
        isDraft,
        contentLength: content.length,
        content: thread.content_for_indexes.substr(0, 100),
        userAgent: request.headers?.['user-agent'],
      });

      // 新帖邮件通知管理员
      if (thread.is_approved === ThreadIsApproved.ok) {
        ThreadController.newThreadMailNoticeAdmin(currentUser, thread).catch(noop);
      }
    } else if (oldCategory && oldCategory !== thread.category_id) {
      // 修改类目
      await thread.saveAndUpdateThreadCount();
      updateCategoryThreadCount(db, oldCategory);
    } else {
      await thread.save();
    }
    firstPost.content = content;
    if (currentUser.id == firstPost.user_id) {
      // 修改帖子更新 ip
      firstPost.ip = formatReqIP(request.ip);
    }
    await firstPost.save();
    userEditThreadLogger.log({
      threadId: id,
      isDraft,
      categoryId,
      title,
      contentLength: content.length,
      content: thread.content_for_indexes.substr(0, 100),
    });

    if (needValidate && !isDraft && (await getSettingValue(db, '__internal_reviewed_content_notice_admin_email')) === '1') {
      insertUserMessage(db, {
        title: '有新修改的帖子需要审核',
        content: '点击"查看详情"跳转至审核页',
        link: '/#/manage/thread?is_approved=0',
        user_id: (await getUserByName(db, 'admin')).id,
        from_user_id: thread.user_id,
        unread_merge_key: 'manageThread',
      }).catch(noop);
    }
    return thread.toViewJSON(currentUser);
  }

  @Delete('/:id')
  async deleteThread(
    @ReqLog('user_delete_thread.json.log') userDeleteThreadLogger: ReqLogger,
    @CurrentUser({ required: true }) currentUser: User,
    @CurrentDB() db: Sequelize,
    @Param('id') id: number,
  ) {
    const thread = await getThread(db, id);
    if (thread == null) throw new UIError('帖子未找到');
    if (!(await thread.canDeleteByUser(currentUser))) {
      throw new UIError('无权删除帖子');
    }
    await thread.deleteByUser(currentUser);

    userDeleteThreadLogger.log({ threadId: id });
    return true;
  }
}
