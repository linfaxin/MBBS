import React from 'react';
import AppPage from '@/components/app-page';
import ThreadList from '@/components/thread-list';
import { history, useModel } from 'umi';
import { useRequest } from 'ahooks';
import { threadApi, userApi } from '@/api';
import OpenPopoverMenu from '@/components/open-popover-menu';
import { showConfirm } from '@/utils/show-alert';
import showSnackbar from '@/utils/show-snackbar';

export default function UserPostsPage() {
  const { user: loginUser } = useModel('useLoginUser');
  const { reloadCategory } = useModel('useCategories');
  const { id } = history.location.query || {};
  const { data: user } = useRequest(async () => (id ? userApi.getUserById(String(id)) : null));

  return (
    <AppPage title={parseInt(String(id)) === loginUser?.id ? '我的帖子' : `${user?.nickname ? `${user.nickname}的` : ''}帖子`}>
      <ThreadList
        queryParam={{ user_id: String(id) }}
        showCategoryName
        renderAfterListTitleThreadCount={(threads, reloadThreads) =>
          loginUser?.username === 'admin' ? (
            <OpenPopoverMenu
              options={[
                {
                  label: (
                    <div>
                      <div>删除当前列表 {threads.length} 个帖子</div>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>该功能仅 admin 可见</div>
                    </div>
                  ),
                  onClick: () => {
                    showConfirm({
                      title: '删除确认',
                      message: `确认删除当前显示列表中的 ${threads.length} 个帖子吗？`,
                      onOkErrorAlert: true,
                      onOk: async () => {
                        const { sucIds } = await threadApi.batchDelete(threads.map((p) => p.id));
                        showSnackbar(`已成功删除 ${sucIds.length} 个帖子`);
                        reloadThreads();
                        reloadCategory();
                      },
                    });
                  },
                },
              ]}
            />
          ) : null
        }
      />
    </AppPage>
  );
}
