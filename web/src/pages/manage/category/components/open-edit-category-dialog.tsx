import React from 'react';
import OpenAlertDialog, { OpenAlertDialogProps } from '@/components/open-alert-dialog';
import { Box, TextField, Switch, FormControlLabel } from '@mui/material';
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
                    beforeUpload={(file) => compressImageFile(file, { maxWidth: 256, maxHeight: 256 })}
                    onUploaded={async (result) => {
                      form.setFieldsValue({ icon: result.filePath });
                    }}
                  >
                    上传新图标
                  </UploadResourceButton>
                </Box>
              )}
            </Field>
            <Field name="name" initialValue={category?.name || ''} rules={[{ required: true, message: '请输入' }]}>
              <TextField
                margin="dense"
                label="名称"
                placeholder="请输入"
                fullWidth
                variant="outlined"
                error={!!form.getFieldError('name')?.length}
                helperText={(form.getFieldError('name') || [])[0]}
                sx={{ marginTop: 2 }}
              />
            </Field>
            <Field name="description" initialValue={category?.description || ''}>
              <TextField
                margin="dense"
                label="描述"
                placeholder="请输入"
                fullWidth
                variant="outlined"
                multiline
                error={!!form.getFieldError('description')?.length}
                helperText={(form.getFieldError('description') || [])[0]}
                sx={{ marginTop: 2 }}
              />
            </Field>
            <Field name="sort" initialValue={category?.sort || ''} rules={[{ required: true, message: '请输入' }]}>
              <TextField
                margin="dense"
                label="排序"
                placeholder="请输入"
                fullWidth
                variant="outlined"
                type="number"
                error={!!form.getFieldError('sort')?.length}
                helperText={(form.getFieldError('sort') || [])[0]}
                sx={{ marginTop: 2 }}
              />
            </Field>
            <Field name="hidden" initialValue={!!category?.hidden} valuePropName="checked">
              <FormControlLabel control={<Switch sx={{ m: 1 }} />} label="隐藏版块" labelPlacement="start" />
            </Field>
            <Field name="disable_post" initialValue={!!category?.disable_post} valuePropName="checked">
              <FormControlLabel control={<Switch sx={{ m: 1 }} />} label="关闭帖子评论功能" labelPlacement="start" />
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
