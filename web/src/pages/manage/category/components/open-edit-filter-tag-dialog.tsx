import React, { useState } from 'react';
import OpenAlertDialog, { OpenAlertDialogProps } from '@/components/open-alert-dialog';
import { Box, DialogContentText } from '@mui/material';
import doTaskWithUI from '@/utils/do-task-with-ui';
import { Category } from '@/api/category';
import ThreadTagSelect from '@/components/thread-tag-select';
import { useRequest } from 'ahooks';
import { categoryApi, threadTagApi } from '@/api';
import { useModel } from '@@/plugin-model/useModel';

const OpenEditFilterTagDialog: React.FC<
  Partial<OpenAlertDialogProps> & {
    category: Category;
    onChanged?: () => void;
  }
> = (props) => {
  const { category, onChanged, ...otherProps } = props;
  const { reloadCategory } = useModel('useCategories');

  const { data: editableThreadTags } = useRequest(() => threadTagApi.listEditableTagForCategory(category.id));

  const [filterThreadTagIds, setFilterThreadTagIds] = useState(category.filter_thread_tag_ids);

  return (
    <OpenAlertDialog
      {...otherProps}
      maxDialogWidth="xs"
      fullWidth
      message={
        <Box>
          <ThreadTagSelect
            label="可筛选标签"
            TextFieldProps={{ fullWidth: true, sx: { mt: 1, mb: 0.5 } }}
            value={(filterThreadTagIds || '')
              .split(',')
              .filter(Boolean)
              .map((id) => parseInt(id))}
            onChange={(value) => setFilterThreadTagIds([].concat(value as any).join(','))}
            multiple
            threadTags={editableThreadTags || []}
          />
          <DialogContentText>设置当前版块内可用于筛选帖子的标签，选中顺序即为筛选项排序</DialogContentText>
        </Box>
      }
      cancelText="取消"
      onOk={async () => {
        await doTaskWithUI({
          task: async () => {
            await categoryApi.setCategory(category.id, { filter_thread_tag_ids: filterThreadTagIds });
            reloadCategory();
            onChanged?.();
          },
          failAlert: true,
          fullScreenLoading: false,
        });
      }}
    >
      {props.children}
    </OpenAlertDialog>
  );
};

export default OpenEditFilterTagDialog;
