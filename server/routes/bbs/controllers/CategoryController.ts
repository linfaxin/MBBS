import { BodyParam, Get, JsonController, Post } from 'routing-controllers';
import { Sequelize } from 'sequelize';
import CurrentDB from '../decorators/CurrentDB';
import { User } from '../../../models/User';
import CurrentDomain from '../decorators/CurrentDomain';
import CurrentUser from '../decorators/CurrentUser';
import { getCategoryById, getCategoryByName, getCategoryModel, removeCategory } from '../../../models/Category';
import UIError from '../../../utils/ui-error';

@JsonController('/category')
export default class CategoryController {
  @Post('/addCategory')
  async addCategory(
    @CurrentDB() db: Sequelize,
    @CurrentUser({ required: true }) currentUser: User,
    @CurrentDomain() domain: string,
    @BodyParam('name', { required: true }) name: string,
    @BodyParam('icon') icon: string,
    @BodyParam('description') description: string,
    @BodyParam('sort') sort: number,
    @BodyParam('hidden') hidden: boolean,
    @BodyParam('disable_post') disable_post: boolean,
    @BodyParam('threads_default_sort') threads_default_sort: string,
    @BodyParam('posts_default_sort') posts_default_sort: string,
    @BodyParam('filter_thread_tag_ids') filter_thread_tag_ids: string,
  ) {
    if (!(await currentUser.isAdmin())) throw new UIError('无权操作');

    if (await getCategoryByName(db, name)) {
      throw new UIError('分类版块名称已存在');
    }
    const CategoryModel = await getCategoryModel(db);
    const category = await CategoryModel.create({
      icon,
      name,
      description,
      sort,
      hidden,
      disable_post,
      threads_default_sort,
      posts_default_sort,
      filter_thread_tag_ids,
    });
    return category.toViewJSON();
  }

  @Post('/removeCategory')
  async removeCategory(
    @CurrentDB() db: Sequelize,
    @CurrentUser({ required: true }) currentUser: User,
    @CurrentDomain() domain: string,
    @BodyParam('category_id', { required: true }) categoryId: number,
  ) {
    if (!(await currentUser.isAdmin())) throw new UIError('无权操作');

    const CategoryModel = await getCategoryModel(db);

    if ((await CategoryModel.count()) <= 1) {
      throw new UIError('不允许清空分类版块');
    }

    return removeCategory(db, categoryId);
  }

  @Post('/setCategory')
  async setCategory(
    @CurrentDB() db: Sequelize,
    @CurrentUser({ required: true }) currentUser: User,
    @CurrentDomain() domain: string,
    @BodyParam('category_id', { required: true }) categoryId: number,
    @BodyParam('icon') icon: string,
    @BodyParam('name') name: string,
    @BodyParam('description') description: string,
    @BodyParam('sort') sort: number,
    @BodyParam('hidden') hidden: boolean,
    @BodyParam('disable_post') disable_post: boolean,
    @BodyParam('threads_default_sort') threads_default_sort: string,
    @BodyParam('posts_default_sort') posts_default_sort: string,
    @BodyParam('filter_thread_tag_ids') filter_thread_tag_ids: string,
  ) {
    if (!(await currentUser.isAdmin())) throw new UIError('无权操作');

    const category = await getCategoryById(db, categoryId);
    if (!category) {
      throw new UIError('未找到分类');
    }

    const CategoryModel = await getCategoryModel(db);
    await CategoryModel.update(
      { icon, name, description, sort, hidden, disable_post, threads_default_sort, posts_default_sort, filter_thread_tag_ids },
      { where: { id: categoryId } },
    );

    return true;
  }

  @Post('/setCategoryCreateThreadTemplate')
  async setCategoryCreateThreadTemplate(
    @CurrentDB() db: Sequelize,
    @CurrentUser({ required: true }) currentUser: User,
    @CurrentDomain() domain: string,
    @BodyParam('category_id', { required: true }) categoryId: number,
    @BodyParam('template') template: string,
  ) {
    if (!(await currentUser.isAdmin())) throw new UIError('无权操作');

    const category = await getCategoryById(db, categoryId);
    if (!category) {
      throw new UIError('未找到分类');
    }

    const CategoryModel = await getCategoryModel(db);
    await CategoryModel.update({ create_thread_template: template }, { where: { id: categoryId } });

    return true;
  }

  @Post('/setCategoryHomeUITip')
  async setCategoryHomeUITip(
    @CurrentDB() db: Sequelize,
    @CurrentUser({ required: true }) currentUser: User,
    @CurrentDomain() domain: string,
    @BodyParam('category_id', { required: true }) categoryId: number,
    @BodyParam('home_ui_tip') homeUITip: string,
  ) {
    if (!(await currentUser.isAdmin())) throw new UIError('无权操作');

    const category = await getCategoryById(db, categoryId);
    if (!category) {
      throw new UIError('未找到分类');
    }

    const CategoryModel = await getCategoryModel(db);
    await CategoryModel.update({ home_ui_tip: homeUITip }, { where: { id: categoryId } });

    return true;
  }

  @Get('/listCategory')
  async listCategory(@CurrentDB() db: Sequelize, @CurrentUser() currentUser: User, @BodyParam('with_hidden') withHidden: boolean) {
    const CategoryModel = await getCategoryModel(db);
    return Promise.all((await CategoryModel.findAll()).map((m) => m.toViewJSON()));
  }
}
