import React, { useMemo } from 'react';
import { history, useModel } from 'umi';
import ThreadList from '@/components/thread-list';
import AppPage from '@/components/app-page';
import { ThreadTag } from '@/api/thread-tag';

export default function ThreadsSearchPage() {
  const { keywords } = history.location.query || {};
  const { categories } = useModel('useCategories');

  const allFilterableThreadTags = useMemo(() => {
    const tagMap = new Map<number, ThreadTag>();
    for (const category of categories || []) {
      for (const tag of category.filter_thread_tags) {
        tagMap.set(tag.id, tag);
      }
    }
    return Array.from(tagMap.values());
  }, [categories]);

  return (
    <AppPage title="全站搜索">
      <ThreadList queryParam={{ keywords: String(keywords) }} filterableThreadTags={allFilterableThreadTags} />
    </AppPage>
  );
}
