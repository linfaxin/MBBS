import fetchApi from '@/api/base/fetch';
import { permissionApi } from '.';
import { ThreadSortKey } from '@/api/thread';
import { PostSortKey } from '@/api/post';
import { ThreadTag } from '@/api/thread-tag';

/**
 * 分类版块
 */
export interface Category {
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
  /** 版块首页自定义内容 */
  home_ui_tip: string;
  /** 是否隐藏 */
  hidden: boolean;
  /** 是否关闭版块评论功能 */
  disable_post: boolean;
  /** 版块帖子 默认排序方式 */
  threads_default_sort?: ThreadSortKey;
  /** 版块帖子评论 默认排序方式 */
  posts_default_sort?: PostSortKey;
  /** 版块帖子标签筛选ID，格式：1,3,4(逗号分隔的 标签ID) */
  filter_thread_tag_ids: string;
  /** 父版块ID */
  parent_category_id?: number;
  /** 版块帖子标签筛选 */
  filter_thread_tags: ThreadTag[];
  /** 创建时间 */
  created_at: string;
  /** 更新时间 */
  updated_at: string;
}

declare type CategoryEditFields = Omit<
  Category,
  'id' | 'created_at' | 'updated_at' | 'filter_thread_tags' | 'home_ui_tip' | 'create_thread_template' | 'thread_count'
>;

export interface CategoryLinked extends Category {
  parent?: CategoryLinked;
  children: CategoryLinked[];
}

let fetchingListCategory: null | Promise<CategoryLinked[]>;
let listCategoryCache: null | CategoryLinked[];

export function listCategory(ignoreCache = false): Promise<CategoryLinked[]> {
  if (fetchingListCategory) {
    return fetchingListCategory;
  }
  if (listCategoryCache && !ignoreCache) {
    return Promise.resolve(listCategoryCache);
  }
  fetchingListCategory = fetchApi('category/listCategory')
    .then((resp) => {
      fetchingListCategory = null;
      const data = makeCategoryLinked(resp.data as CategoryLinked[]).filter((c) => !isCategoryHiddenOrParentHidden(c));
      listCategoryCache = data;
      return data;
    })
    .catch((e) => {
      fetchingListCategory = null;
      throw e;
    });
  return fetchingListCategory;
}

export function listAllCategoryWithHidden(): Promise<CategoryLinked[]> {
  return fetchApi('category/listCategory').then((resp) => makeCategoryLinked(resp.data));
}

export function listCategorySorted(ignoreCache = false): Promise<CategoryLinked[]> {
  return listCategory(ignoreCache);
}

export async function listCategoryCanCreateSorted(ignoreCache = false): Promise<CategoryLinked[]> {
  const allCategories = await listCategorySorted(ignoreCache);
  const myPermissions = await permissionApi.getMyPermissions();
  if (myPermissions.includes('createThread')) {
    // 全局创建帖子权限
    return allCategories;
  }
  return allCategories.filter((c) => myPermissions.includes(`category${c.id}.createThread`));
}

export async function getCategory(categoryId: number | string) {
  const findInCache = (await listCategory(false)).find((p) => p.id == categoryId);
  if (findInCache) return findInCache;
  return (await listCategory(true)).find((p) => p.id == categoryId);
}

export function addCategory(param: Partial<CategoryEditFields>): Promise<Category> {
  return fetchApi({
    pathOrUrl: 'category/addCategory',
    method: 'post',
    data: param,
  }).then((resp) => {
    listCategoryCache = null;
    return resp.data;
  });
}

export function setCategory(category_id: string | number, param: Partial<CategoryEditFields>): Promise<boolean> {
  return fetchApi({
    pathOrUrl: 'category/setCategory',
    method: 'post',
    data: {
      category_id,
      ...param,
    },
  }).then((resp) => {
    listCategoryCache = null;
    return resp.data;
  });
}

export async function setCategoryCreateThreadTemplate(category_id: string | number, param: { template: string }): Promise<void> {
  await fetchApi({
    pathOrUrl: 'category/setCategoryCreateThreadTemplate',
    method: 'post',
    data: {
      category_id,
      ...param,
    },
  });
}

export async function setCategoryHomeUITip(category_id: string | number, homeUITip: string): Promise<void> {
  await fetchApi({
    pathOrUrl: 'category/setCategoryHomeUITip',
    method: 'post',
    data: {
      category_id,
      home_ui_tip: homeUITip,
    },
  });
}

export function removeCategory(category_id: string | number): Promise<void> {
  return fetchApi({
    pathOrUrl: 'category/removeCategory',
    method: 'post',
    data: { category_id },
  }).then((resp) => {
    listCategoryCache = null;
  });
}

function makeCategoryLinked(categories: CategoryLinked[]) {
  const categoryMap = new Map<number | undefined, CategoryLinked>();
  for (const c of categories) {
    categoryMap.set(c.id, c);
  }

  for (const c of categories) {
    const parentCategory = categoryMap.get(c.parent_category_id);
    if (parentCategory) {
      c.parent = parentCategory;
      parentCategory.children = parentCategory.children || [];
      parentCategory.children.push(c);
    }
  }

  const sortedCategories: CategoryLinked[] = [];

  function deepTravelCategory(c: CategoryLinked) {
    sortedCategories.push(c);
    c.children?.sort((c1, c2) => c1.sort - c2.sort).forEach(deepTravelCategory);
  }
  categories
    .filter((c) => !c.parent)
    .sort((c1, c2) => c1.sort - c2.sort)
    .forEach(deepTravelCategory);

  return sortedCategories;
}

export function isCategoryHiddenOrParentHidden(category: CategoryLinked): boolean {
  if (category.hidden) return true;
  if (category.parent) {
    return isCategoryHiddenOrParentHidden(category.parent);
  }
  return false;
}

export function getCategoryFullName(category: CategoryLinked | undefined): string | undefined {
  if (!category) return undefined;
  const names = [];
  let checkCategory: CategoryLinked | undefined = category;

  while (checkCategory) {
    names.unshift(checkCategory.name);
    checkCategory = checkCategory.parent;
  }

  return names.join('/');
}

export function getCategoryTotalThreadCount(category: CategoryLinked | undefined): number {
  if (!category) return 0;

  let count = 0;

  function deepTravelCategory(c: CategoryLinked) {
    count += c.thread_count;
    c.children?.forEach(deepTravelCategory);
  }

  deepTravelCategory(category);

  return count;
}
