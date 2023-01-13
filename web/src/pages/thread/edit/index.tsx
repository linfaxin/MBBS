import { history, useModel, useParams } from 'umi';
import React, { useRef, useState } from 'react';
import { categoryApi, threadApi } from '@/api';
import { Box, MenuItem, TextField } from '@mui/material';
import showAlert from '@/utils/show-alert';
import showSnackbar from '@/utils/show-snackbar';
import AppPage from '@/components/app-page';
import { Thread, ThreadIsApproved } from '@/api/thread';
import { useRequest } from 'ahooks';
import MarkdownThreadContentEditor from '@/components/thread-content/thread-content-editor';

export default function EditThreadPage() {
  const { id: threadId } = useParams() as any;
  const { reloadCategory } = useModel('useCategories');
  const titleValueRef = useRef('');
  const [thread, setThread] = useState<Thread>();
  const [categoryId, setCategoryId] = useState<number | string>('');
  const { data: categories } = useRequest(() => categoryApi.listCategoryCanCreateSorted());

  if (!threadId) return null;

  return (
    <AppPage
      parentPageCategoryId={thread?.category_id}
      requestNavBackButton
      initPage={
        thread
          ? undefined
          : async () => {
              const thread =
                history.location.query?.isAdmin === '1' ? await threadApi.getThreadForAdmin(threadId) : await threadApi.getThread(threadId);
              titleValueRef.current = thread.title;
              setThread(thread);
              setCategoryId(thread.category_id);
            }
      }
      title="编辑帖子"
    >
      {!!categories?.length && (
        <Box>
          <TextField
            label="分类版块"
            variant="outlined"
            size="small"
            select
            sx={{ mb: 1.6, mt: 1.2 }}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            {(categories || []).map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      )}
      <TextField
        label="帖子标题"
        placeholder="请输入帖子标题"
        variant="outlined"
        fullWidth
        size="small"
        inputProps={{
          maxLength: 100,
        }}
        defaultValue={titleValueRef.current}
        onChange={(e) => (titleValueRef.current = e.target.value)}
      />
      <MarkdownThreadContentEditor
        categoryId={parseInt(String(categoryId))}
        sx={{ marginTop: 1, height: '70vh' }}
        vditor={{
          // count: 10000,
          placeholder: '请输入帖子内容',
          afterInit: (vditor) => {
            const threadContent = (thread?.content || '').trim();
            vditor.setValue(threadContent);
          },
        }}
        submitText="发布"
        failAlert
        onSubmit={async (inputValue) => {
          const title = titleValueRef.current;
          const content = inputValue;
          if (!title) return showAlert('请输入标题');
          if (!content.replace(/\n/g, '').trim()) return showAlert('请输入帖子内容');
          const savedThread = await threadApi.modify(threadId, {
            title,
            content,
            category_id: categoryId,
          });
          if (savedThread.is_approved === ThreadIsApproved.checking) {
            showAlert('提交成功，等待管理员审核中');
          } else {
            showSnackbar('保存成功');
          }
          history.goBack();
          reloadCategory();
        }}
      />
    </AppPage>
  );
}
