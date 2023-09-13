import React from 'react';
import OpenAlertDialog, { OpenAlertDialogProps } from '@/components/open-alert-dialog';
import { Box, TextField, Switch, FormControlLabel, MenuItem, Button } from '@mui/material';
import doTaskWithUI from '@/utils/do-task-with-ui';
import Form, { Field } from 'rc-field-form';
import { FormInstance } from 'rc-field-form/es/interface';
import { getResourceUrl } from '@/utils/resource-url';
import { compressImageFile } from '@/utils/compress-image-util';
import UploadResourceButton from '@/components/upload-resource-button';
import { Category } from '@/api/category';

const OpenEditCategoryDialog: React.FC<
  Partial<OpenAlertDialogProps> & {
    category?: Category;
    doSubmitCategory: (fields: Pick<Category, 'name' | 'description' | 'icon' | 'sort'>) => void | Promise<void>;
  }
> = (props) => {
  const { category, doSubmitCategory, ...otherProps } = props;

  let innerForm: FormInstance;
  const EditCategoryForm = () => {
    const [form] = Form.useForm();
    innerForm = form;
    return (
      <Form form={form}>
        {() => (
          <>
            <Field name="icon" initialValue={category?.icon || ''}>
              {() => (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <img
                    alt="avatar"
                    src={getResourceUrl(form.getFieldValue('icon')) || require('@/images/default-category.png')}
                    style={{ width: 80, height: 80 }}
                  />
                  <UploadResourceButton
                    sx={{ marginLeft: 2 }}
                    beforeUpload={(file) => compressImageFile(file, { maxWidth: 256, maxHeight: 256, mimeType: 'image/png' })}
                    onUploaded={async (result) => {
                      form.setFieldsValue({ icon: result.filePath });
                    }}
                  >
                    上传新图标
                  </UploadResourceButton>
                  {form.getFieldValue('icon') && <Button onClick={() => form.setFieldsValue({ icon: '' })}>删除</Button>}
                </Box>
              )}
            </Field>
            <Field name="name" initialValue={category?.name || ''} rules={[{ required: true, message: '请输入' }]}>
              <TextField
                margin="dense"
                label="名称"
                placeholder="请输入"
                size="small"
                fullWidth
                variant="outlined"
                error={!!form.getFieldError('name')?.length}
                helperText={(form.getFieldError('name') || [])[0]}
                sx={{ marginTop: 1 }}
              />
            </Field>
            <Field name="description" initialValue={category?.description || ''}>
              <TextField
                margin="dense"
                label="描述"
                placeholder="请输入"
                size="small"
                fullWidth
                variant="outlined"
                multiline
                error={!!form.getFieldError('description')?.length}
                helperText={(form.getFieldError('description') || [])[0]}
                sx={{ marginTop: 1 }}
              />
            </Field>
            <Field name="sort" initialValue={category?.sort || ''} rules={[{ required: true, message: '请输入' }]}>
              <TextField
                margin="dense"
                label="排序"
                placeholder="请输入"
                size="small"
                fullWidth
                variant="outlined"
                type="number"
                error={!!form.getFieldError('sort')?.length}
                helperText={(form.getFieldError('sort') || [])[0]}
                sx={{ marginTop: 1 }}
              />
            </Field>
            <Field
              name="threads_default_sort"
              initialValue={category?.threads_default_sort || '-posted_at'}
              rules={[{ required: true, message: '请选择' }]}
            >
              <TextField
                margin="dense"
                label="帖子默认排序"
                placeholder="请选择"
                size="small"
                fullWidth
                select
                variant="outlined"
                error={!!form.getFieldError('threads_default_sort')?.length}
                helperText={(form.getFieldError('threads_default_sort') || [])[0]}
                sx={{ marginTop: 1 }}
              >
                <MenuItem value="-posted_at">最新回复</MenuItem>
                <MenuItem value="-created_at">最新发帖</MenuItem>
                <MenuItem value="-modified_at">最新修改</MenuItem>
              </TextField>
            </Field>
            <Field name="hidden" initialValue={!!category?.hidden} valuePropName="checked">
              <FormControlLabel
                sx={{ m: 0.5, mr: 2 }}
                control={<Switch size="small" sx={{ m: 0.5 }} />}
                label="隐藏版块"
                labelPlacement="start"
              />
            </Field>
            <Field name="disable_post" initialValue={!!category?.disable_post} valuePropName="checked">
              <FormControlLabel
                sx={{ m: 0.5, mr: 2 }}
                control={<Switch size="small" sx={{ m: 0.5 }} />}
                label="关闭帖子评论功能"
                labelPlacement="start"
              />
            </Field>
          </>
        )}
      </Form>
    );
  };

  return (
    <OpenAlertDialog
      {...otherProps}
      onOpenChange={(open) => {
        if (!open) {
          innerForm.resetFields();
        }
      }}
      maxDialogWidth="xs"
      fullWidth
      message={<EditCategoryForm />}
      cancelText="取消"
      onOk={async () => {
        await innerForm.validateFields();
        await doTaskWithUI({
          task: async () => doSubmitCategory(innerForm.getFieldsValue()),
          failAlert: true,
          fullScreenLoading: false,
        });
      }}
    >
      {props.children}
    </OpenAlertDialog>
  );
};

export default OpenEditCategoryDialog;
