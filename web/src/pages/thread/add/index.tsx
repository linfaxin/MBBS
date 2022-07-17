import { history, useModel } from 'umi';
import React, { useEffect, useState } from 'react';
import { threadApi } from '@/api';
import { Alert, TextField } from '@mui/material';
import showAlert from '@/utils/show-alert';
import { clearPageState } from '@/utils/use-page-history-hooks';
import showSnackbar from '@/utils/show-snackbar';
import AppPage from '@/components/app-page';
import { Thread, ThreadIsApproved } from '@/api/thread';
import ApiUI from '@/api-ui';
import MarkdownPreview from '@/components/vditor/markdown-preview';
import MarkdownThreadContentEditor from '@/components/thread-content/thread-content-editor';
import showPromptDialog from '@/utils/show-prompt-dialog';

export default function AddThreadPage() {
  const bbsSetting = useModel('useBBSSetting');
  const { refreshUser } = useModel('useLoginUser');
  const { categories, reloadCategory } = useModel('useCategories');
  const category_id = String((history.location.query || {}).category_id || '');
  const [title, setTitle] = useState('');
  const [draft, setDraft] = useState<Thread>();
  const category = categories?.filter((c) => String(c.id) == category_id)?.[0];

  useEffect(() => {
    (async () => {
      try {
        if (!category_id) return null;
        // 检查是否可以发帖
        const checkResult = await threadApi.checkCanCreate(category_id);
        if (!checkResult.canCreate) {
          showAlert(checkResult.cantCreateReason || '发帖校验失败，不允许发帖');
          history.goBack();
          return;
        }
        if (ApiUI.checkBeforeCreateThread) {
          await ApiUI.checkBeforeCreateThread(parseInt(category_id));
        }
      } catch (e: any) {
        showAlert(`发帖校验异常：${e.message}`);
        return;
      }
      // 检查是否有草稿
      const myDrafts = await threadApi.listMyDrafts({ category_id });
      if (myDrafts.list?.length) {
        showPromptDialog({
          title: '用草稿继续编辑吗？',
          description: `当前版块有 ${myDrafts.list.length} 篇你的草稿。${myDrafts.list.length > 1 ? '可选择其中一篇草稿继续编辑' : ''}`,
          inputLabel: '',
          defaultValue: String(myDrafts.list[0].id),
          options: myDrafts.list.map((t) => ({
            label: `标题：${t.title || '(空)'}`,
            value: String(t.id),
          })),
          onSubmit: (selectId) => {
            const selectDraft = myDrafts.list.find((t) => String(t.id) === selectId);
            if (selectDraft?.title) setTitle(selectDraft.title);
            setDraft(selectDraft);
          },
        });
      }
    })();
  }, []);

  if (!category_id || !category) return null;

  return (
    <AppPage parentPageCategoryId={category_id} title="发布帖子" requestNavBackButton>
      {bbsSetting.ui_tip_publish_thread?.trim() && (
        <Alert severity="info" sx={{ marginBottom: 1.4 }}>
          <MarkdownPreview markdown={bbsSetting.ui_tip_publish_thread} style={{ fontSize: 'inherit' }} />
        </Alert>
      )}
      <TextField
        label="帖子标题"
        placeholder="请输入帖子标题"
        variant="outlined"
        fullWidth
        size="small"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <MarkdownThreadContentEditor
        key={draft?.id}
        categoryId={parseInt(category_id)}
        defaultMarkdown={draft?.content || category.create_thread_template}
        sx={{ marginTop: 1, height: '70vh' }}
        vditor={{
          // count: 10000,
          placeholder: '请输入帖子内容',
        }}
        failAlert
        submitText="发布"
        onSubmit={async (inputValue) => {
          const content = inputValue;
          if (!title) return showAlert('请输入标题');
          if (!content.replace(/\n/g, '').trim()) return showAlert('请输入帖子内容');
          if (ApiUI.checkBeforeCreateThread) {
            await ApiUI.checkBeforeCreateThread(parseInt(category_id));
          }
          const thread = draft
            ? await threadApi.modify(draft.id, { title, content, category_id, is_draft: false })
            : await threadApi.create({ title, content, category_id });
          if (thread.is_approved === ThreadIsApproved.checking) {
            showAlert('提交成功，等待管理员审核中');
          } else {
            showSnackbar('发布成功');
            refreshUser(); // 更新用户的 发帖数
          }
          clearPageState(`/thread/category/${category_id}`);
          history.goBack();
          reloadCategory();
        }}
        cancelText="存草稿"
        onCancel={async (inputValue) => {
          if (!title) return showAlert('请输入标题');
          if (draft) {
            // 存当前草稿
            await threadApi.modify(draft.id, { title, content: inputValue, category_id, is_draft: true });
          } else {
            // 创建新草稿
            const newDraft = await threadApi.create({ title, content: inputValue, category_id, is_draft: true });
            setDraft(newDraft);
          }
          showSnackbar('保存草稿成功');
        }}
      />
    </AppPage>
  );
}
