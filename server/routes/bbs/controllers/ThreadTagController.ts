import { BodyParam, Get, JsonController, Post, QueryParam } from 'routing-controllers';
import { Sequelize } from 'sequelize';
import CurrentDB from '../decorators/CurrentDB';
import { User } from '../../../models/User';
import CurrentDomain from '../decorators/CurrentDomain';
import CurrentUser from '../decorators/CurrentUser';
import UIError from '../../../utils/ui-error';
import { getThreadTagById, getThreadTagByName, getThreadTagModel, removeThreadTag } from '../../../models/ThreadTag';
import { getThread } from '../../../models/Thread';

@JsonController('/threadTag')
export default class ThreadTagController {
  @Post('/addTag')
  async addTag(
    @CurrentDB() db: Sequelize,
    @CurrentUser({ required: true }) currentUser: User,
    @CurrentDomain() domain: string,
    @BodyParam('name', { required: true }) name: string,
    @BodyParam('icon') icon: string,
    @BodyParam('description') description?: string,
    @BodyParam('hidden_in_thread_view') hidden_in_thread_view?: boolean,
    @BodyParam('limit_use_in_categories') limit_use_in_categories?: string,
    @BodyParam('limit_use_by_groups') limit_use_by_groups?: string,
    @BodyParam('limit_thread_read_groups') limit_thread_read_groups?: string,
    @BodyParam('limit_thread_write_groups') limit_thread_write_groups?: string,
  ) {
    if (!(await currentUser.isAdmin())) throw new UIError('无权操作');

    if (await getThreadTagByName(db, name)) {
      throw new UIError('标签名称已存在');
    }
    const ThreadTagModel = await getThreadTagModel(db);
    const threadTag = await ThreadTagModel.create({
      icon,
      name,
      description,
      hidden_in_thread_view,
      limit_use_in_categories,
      limit_use_by_groups: limit_use_by_groups,
      limit_thread_read_groups,
      limit_thread_write_groups,
    });
    return threadTag.toJSON();
  }

  @Post('/removeTag')
  async removeTag(
    @CurrentDB() db: Sequelize,
    @CurrentUser({ required: true }) currentUser: User,
    @CurrentDomain() domain: string,
    @BodyParam('tag_id', { required: true }) tagId: number,
  ) {
    if (!(await currentUser.isAdmin())) throw new UIError('无权操作');
    if (tagId < 100) {
      throw new UIError('不允许删除系统预置标签(ID<100)');
    }

    return removeThreadTag(db, tagId);
  }

  @Post('/setTag')
  async setTag(
    @CurrentDB() db: Sequelize,
    @CurrentUser({ required: true }) currentUser: User,
    @CurrentDomain() domain: string,
    @BodyParam('tag_id', { required: true }) tagId: number,
    @BodyParam('name') name?: string,
    @BodyParam('icon') icon?: string,
    @BodyParam('description') description?: string,
    @BodyParam('hidden_in_thread_view') hidden_in_thread_view?: boolean,
    @BodyParam('limit_use_in_categories') limit_use_in_categories?: string,
    @BodyParam('limit_use_by_groups') limit_use_by_groups?: string,
    @BodyParam('limit_thread_read_groups') limit_thread_read_groups?: string,
    @BodyParam('limit_thread_write_groups') limit_thread_write_groups?: string,
  ) {
    if (!(await currentUser.isAdmin())) throw new UIError('无权操作');

    const threadTag = await getThreadTagById(db, tagId);
    if (!threadTag) {
      throw new UIError('未找到分类');
    }

    const ThreadTagModel = await getThreadTagModel(db);
    if (tagId < 100) {
      // 系统预置标签（ID < 100）不允许修改 限制使用版块/角色
      limit_use_in_categories = null;
      limit_use_by_groups = null;
    }
    await ThreadTagModel.update(
      {
        name: name == null ? threadTag.name : name,
        icon: icon == null ? threadTag.icon : icon,
        description: description == null ? threadTag.description : description,
        hidden_in_thread_view: hidden_in_thread_view == null ? threadTag.hidden_in_thread_view : hidden_in_thread_view,
        limit_use_in_categories: limit_use_in_categories == null ? threadTag.limit_use_in_categories : limit_use_in_categories,
        limit_use_by_groups: limit_use_by_groups == null ? threadTag.limit_use_by_groups : limit_use_by_groups,
        limit_thread_read_groups: limit_thread_read_groups == null ? threadTag.limit_thread_read_groups : limit_thread_read_groups,
        limit_thread_write_groups: limit_thread_write_groups == null ? threadTag.limit_thread_write_groups : limit_thread_write_groups,
      },
      { where: { id: tagId } },
    );

    return true;
  }

  @Get('/listAllTag')
  async listAllTag(@CurrentDB() db: Sequelize, @CurrentUser() currentUser: User) {
    if (!(await currentUser.isAdmin())) throw new UIError('无权操作');
    const ThreadTagModel = await getThreadTagModel(db);
    return (await ThreadTagModel.findAll()).map((m) => m.toJSON());
  }

  @Get('/listEditableTagForThread')
  async listEditableTagForThread(
    @CurrentDB() db: Sequelize,
    @CurrentUser({ required: true }) currentUser: User,
    @QueryParam('thread_id', { required: true }) threadId: number,
  ) {
    const thread = await getThread(db, threadId);
    if (!thread) {
      throw new UIError('未找到帖子');
    }

    const ThreadTagModel = await getThreadTagModel(db);
    let currentUserGroupId = await currentUser.getGroupId();

    return (await ThreadTagModel.findAll())
      .filter((tag) => tag.canUseByGroupAndCategory(currentUserGroupId, thread.category_id, thread.user_id === currentUser.id))
      .map((m) => m.toJSON());
  }

  @Get('/listEditableTagForCategory')
  async listEditableTagForCategory(
    @CurrentDB() db: Sequelize,
    @CurrentUser({ required: true }) currentUser: User,
    @QueryParam('category_id', { required: true }) categoryId: number,
  ) {
    const ThreadTagModel = await getThreadTagModel(db);
    return (await ThreadTagModel.findAll()).filter((tag) => tag.canUseInCategory(categoryId)).map((m) => m.toJSON());
  }

  @Get('/listEditableTagForAllCategory')
  async listEditableTagForAllCategory(@CurrentDB() db: Sequelize, @CurrentUser({ required: true }) currentUser: User) {
    const ThreadTagModel = await getThreadTagModel(db);
    return (await ThreadTagModel.findAll()).filter((tag) => !tag.limit_use_in_categories).map((m) => m.toJSON());
  }

  @Post('/bindTagForThread')
  async bindTagForThread(
    @CurrentDB() db: Sequelize,
    @CurrentUser({ required: true }) currentUser: User,
    @BodyParam('tag_id', { required: true }) tagId: number,
    @BodyParam('thread_id', { required: true }) threadId: number,
  ) {
    const currentUserGroupId = await currentUser.getGroupId();

    const threadTag = await getThreadTagById(db, tagId);
    if (!threadTag) {
      throw new UIError('未找到标签');
    }
    const thread = await getThread(db, threadId);
    if (!thread) {
      throw new UIError('未找到帖子');
    }

    if (!threadTag.canUseByGroupAndCategory(currentUserGroupId, thread.category_id, thread.user_id === currentUser.id)) {
      throw new UIError('无权在当前帖子添加该标签');
    }

    await thread.addTag(tagId);
  }

  @Post('/unbindTagForThread')
  async unbindTagForThread(
    @CurrentDB() db: Sequelize,
    @CurrentUser({ required: true }) currentUser: User,
    @BodyParam('tag_id', { required: true }) tagId: number,
    @BodyParam('thread_id', { required: true }) threadId: number,
  ) {
    const currentUserGroupId = await currentUser.getGroupId();

    const threadTag = await getThreadTagById(db, tagId);
    if (!threadTag) {
      throw new UIError('未找到标签');
    }
    const thread = await getThread(db, threadId);
    if (!thread) {
      throw new UIError('未找到帖子');
    }

    if (!threadTag.canUseByGroupAndCategory(currentUserGroupId, thread.category_id, thread.user_id === currentUser.id)) {
      throw new UIError('无权在当前帖子删除该标签');
    }

    await thread.removeTag(tagId);
  }
}
