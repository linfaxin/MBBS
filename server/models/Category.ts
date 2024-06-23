import { Op, Model, Sequelize, DataTypes, Transactionable } from 'sequelize';
import { createModelCache } from '../utils/model-cache';
import { getThreadModel, NormalThreadFilter } from './Thread';
import { getThreadTagById, THREAD_TAG_ID_ESSENCE } from './ThreadTag';

/**
 * 帖子分类
 */
export class Category extends Model<Partial<Category>> {
  id: number;
  /** 分类名称 */
  name: string;
  /** 分类描述 */
  description: string;
  /** 分类图标 */
  icon: string;
  /** 分类间排序 */
  sort: number;
  /** 分类内帖子数量 */
  thread_count: number;
  /** 分类创建帖子时的 默认内容模版 */
  create_thread_template: string;
  /** 板块首页自定义内容 */
  home_ui_tip: string;
  /** 是否隐藏 */
  hidden: boolean;
  /** 是否板块级别关闭评论 */
  disable_post: boolean;
  /** 板块内帖子默认排序方式 */
  threads_default_sort: string;
  /** 板块内帖子评论默认排序方式 */
  posts_default_sort: string;
  /** 板块内支持的可筛选标签，格式：1,3,4 （逗号分隔的标签ID） */
  filter_thread_tag_ids: string;
  /** 父板块id */
  parent_category_id: number;
  /** 创建时间 */
  created_at: Date;
  /** 更新时间 */
  updated_at: Date;
  async toViewJSON() {
    return {
      ...this.toJSON(),
      filter_thread_tags: (
        await Promise.all(
          (this.filter_thread_tag_ids || '')
            .split(',')
            .filter(Boolean)
            .map((tagId) => getThreadTagById(this.sequelize, parseInt(tagId))),
        )
      )
        .filter(Boolean)
        .map((tag) => tag?.toJSON()),
    };
  }
}
const CategoryCache = createModelCache(Category, {
  max: 100,
  getCacheKey: (m) => m.id,
});

export async function getCategoryById(db: Sequelize, categoryId: number): Promise<Category> {
  return CategoryCache.getInCache(db, categoryId) || (await getCategoryModel(db)).findByPk(categoryId);
}

export async function getCategoryByName(db: Sequelize, name: string): Promise<Category> {
  return CategoryCache.getAllCachedValue(db).find((m) => m.name === name) || (await getCategoryModel(db)).findOne({ where: { name } });
}

// 删除分类（软删）
export async function removeCategory(db: Sequelize, categoryId: number): Promise<boolean> {
  const CategoryModel = await getCategoryModel(db);
  const category = await CategoryModel.findOne({ where: { id: categoryId } });
  if (category) {
    await db.transaction(async (t) => {
      category.name = `[已删除-${category.id}]${category.name}`;
      await category.save({ transaction: t });
      await category.destroy({ transaction: t });
    });
  }
  return !!category;
}

export async function updateCategoryThreadCount(db: Sequelize, categoryId: number, option?: Transactionable) {
  const ThreadModel = await getThreadModel(db);
  // 分类下帖子数量更新
  const CategoryModel = await getCategoryModel(db);
  await CategoryModel.update(
    {
      thread_count: await ThreadModel.count({
        where: {
          ...NormalThreadFilter,
          category_id: categoryId,
        },
        ...option,
      }),
    },
    {
      where: { id: categoryId },
      ...option,
    },
  );
}

const waitDBSync = new WeakMap<Sequelize, Promise<any>>();
export async function getCategoryModel(db: Sequelize): Promise<typeof Category> {
  if (waitDBSync.has(db)) {
    await waitDBSync.get(db);
  }
  if (db.models && db.models.Category) {
    return db.models.Category as typeof Category;
  }
  class DBCategory extends Category {}
  DBCategory.init(
    {
      // Model attributes are defined here
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        unique: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.TEXT,
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.TEXT,
      },
      icon: {
        type: DataTypes.TEXT,
      },
      create_thread_template: {
        type: DataTypes.TEXT,
      },
      home_ui_tip: {
        type: DataTypes.TEXT,
      },
      sort: {
        type: DataTypes.INTEGER,
      },
      thread_count: {
        type: DataTypes.INTEGER,
      },
      hidden: {
        type: DataTypes.BOOLEAN,
      },
      disable_post: {
        type: DataTypes.BOOLEAN,
      },
      threads_default_sort: {
        type: DataTypes.TEXT,
      },
      posts_default_sort: {
        type: DataTypes.TEXT,
      },
      filter_thread_tag_ids: {
        type: DataTypes.TEXT,
      },
      parent_category_id: {
        type: DataTypes.INTEGER,
      },
    },
    {
      sequelize: db,
      modelName: 'Category',
      tableName: 'categories',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
      paranoid: true,
      indexes: [{ fields: ['name'] }],
    },
  );

  waitDBSync.set(
    db,
    DBCategory.sync({ alter: { drop: false } }).then(async () => {
      try {
        // 补齐板块默认的标签筛选条件
        if (
          await DBCategory.findOne({
            where: { filter_thread_tag_ids: { [Op.is]: null } },
          })
        ) {
          await DBCategory.update(
            {
              filter_thread_tag_ids: String(THREAD_TAG_ID_ESSENCE),
            },
            {
              where: {
                filter_thread_tag_ids: {
                  [Op.is]: null,
                },
              },
            },
          );
        }
      } catch (e) {
        // 忽略报错
      }
    }),
  );
  await waitDBSync.get(db);
  waitDBSync.delete(db);
  return DBCategory;
}
