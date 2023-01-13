import fetchApi from '@/api/base/fetch';
import { permissionApi } from '.';
import { ThreadSortKey } from '@/api/thread';

/**
 * 分类板块
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
  /** 是否隐藏 */
  hidden: boolean;
  /** 是否关闭板块评论功能 */
  disable_post: boolean;
  /** 板块帖子默认排序方式 */
  threads_default_sort?: ThreadSortKey;
  /** 创建时间 */
  created_at: string;
  /** 更新时间 */
  updated_at: string;
}

let fetchingListCategory: null | Promise<Category[]>;
let listCategoryCache: null | Category[];

export function listCategory(ignoreCache = false): Promise<Category[]> {
  if (fetchingListCategory) {
    return fetchingListCategory;
  }
  if (listCategoryCache && !ignoreCache) {
    return Promise.resolve(listCategoryCache);
  }
  fetchingListCategory = fetchApi('category/listCategory')
    .then((resp) => {
      fetchingListCategory = null;
      const data = resp.data.filter((c: Category) => !c.hidden);
      listCategoryCache = data;
      return data;
    })
    .catch((e) => {
      fetchingListCategory = null;
      throw e;
    });
  return fetchingListCategory;
}

export function listAllCategoryWithHidden(): Promise<Category[]> {
  return fetchApi('category/listCategory').then((resp) => resp.data);
}

export function listCategorySorted(ignoreCache = false): Promise<Category[]> {
  return listCategory(ignoreCache).then((list) => [...list].sort((a, b) => a.sort - b.sort));
}

export async function listCategoryCanCreateSorted(ignoreCache = false): Promise<Category[]> {
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

export function addCategory(param: Pick<Category, 'name' | 'description' | 'icon' | 'sort'>): Promise<Category> {
  return fetchApi({
    pathOrUrl: 'category/addCategory',
    method: 'post',
    data: param,
  }).then((resp) => {
    listCategoryCache = null;
    return resp.data;
  });
}

export function setCategory(
  category_id: string | number,
  param: Pick<Category, 'name' | 'description' | 'icon' | 'sort'>,
): Promise<boolean> {
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

export function removeCategory(category_id: string | number): Promise<void> {
  return fetchApi({
    pathOrUrl: 'category/removeCategory',
    method: 'post',
    data: { category_id },
  }).then((resp) => {
    listCategoryCache = null;
  });
}
