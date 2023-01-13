import { useRequest } from 'ahooks';
import { categoryApi } from '@/api';

export default function useCategories() {
  const { data: categories, refresh } = useRequest(() => categoryApi.listCategory());

  return {
    categories,
    categoriesSorted: [...(categories || [])].sort((a, b) => a.sort - b.sort),
    reloadCategory: () =>
      categoryApi.listCategory(true).then(async (categories) => {
        await refresh();
        return categories;
      }),
  };
}
