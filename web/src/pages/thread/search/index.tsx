import React from 'react';
import { history } from 'umi';
import ThreadList from '@/components/thread-list';
import AppPage from '@/components/app-page';

export default function ThreadsSearchPage() {
  const { keywords } = history.location.query || {};

  return (
    <AppPage title="全站搜索">
      <ThreadList queryParam={{ keywords: String(keywords) }} />
    </AppPage>
  );
}
