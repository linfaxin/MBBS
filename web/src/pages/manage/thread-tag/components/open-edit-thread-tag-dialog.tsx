import React from 'react';
import OpenAlertDialog, { OpenAlertDialogProps } from '@/components/open-alert-dialog';
import { Box, TextField, Switch, FormControlLabel, Button } from '@mui/material';
import doTaskWithUI from '@/utils/do-task-with-ui';
import Form, { Field } from 'rc-field-form';
import { FormInstance } from 'rc-field-form/es/interface';
import { getResourceUrl } from '@/utils/resource-url';
import { compressImageFile } from '@/utils/compress-image-util';
import UploadResourceButton from '@/components/upload-resource-button';
import { ThreadTag } from '@/api/thread-tag';
import CategorySelect from '@/components/category-select';
import { useModel } from 'umi';
import TipIconButton from '@/components/tip-icon-button';
import GroupSelect from '@/components/group-select';
import { useRequest } from 'ahooks';
import { groupApi } from '@/api';
import { Group } from '@/api/group';
import { GROUP_ID_TOURIST } from '@/consts';

const OpenEditThreadTagDialog: React.FC<
  Partial<OpenAlertDialogProps> & {
    threadTag?: ThreadTag;
    doSubmit: (fields: Omit<ThreadTag, 'id' | 'created_at' | 'updated_at'>) => void | Promise<void>;
  }
> = (props) => {
  const { threadTag, doSubmit, ...otherProps } = props;
  const { data: allGroups } = useRequest(async () => [
    { id: -1, name: '帖子作者' } as Group, // 帖子作者 作为一种 特殊角色
    ...(await groupApi.listGroup()),
  ]);
  const allGroupsWithTourist = [{ id: GROUP_ID_TOURIST, name: '游客' } as Group].concat(allGroups || []);

  const { categories } = useModel('useCategories');

  let innerForm: FormInstance;
  const EditForm = () => {
    const [form] = Form.useForm();
    innerForm = form;
    return (
      <Form form={form}>
        {() => (
          <>
            <Field name="icon" initialValue={threadTag?.icon || ''}>
              {() => (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  图标：
                  {form.getFieldValue('icon') ? (
                    <img alt="icon" src={getResourceUrl(form.getFieldValue('icon'))} style={{ width: 20, height: 20 }} />
                  ) : (
                    '无'
                  )}
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
                  <TipIconButton message="设置后，图标会代替文字显示在帖子标题处" />
                </Box>
              )}
            </Field>
            <Field name="name" initialValue={threadTag?.name || ''} rules={[{ required: true, message: '请输入' }]}>
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
            <Field name="description" initialValue={threadTag?.description || ''}>
              <TextField
                margin="dense"
                label="标签描述"
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
            {threadTag && threadTag.id < 100 ? null : ( // 系统预置标签（ID<100）无需限制使用板块和角色（是系统代码层面自动添加的标签）
              <>
                <Box display="flex" alignItems="center" mt={1}>
                  <span style={{ flexShrink: 0 }}>限制使用板块：</span>
                  <Field name="limit_use_in_categories" initialValue={threadTag?.limit_use_in_categories || ''}>
                    {() => (
                      <CategorySelect
                        TextFieldProps={{ fullWidth: true }}
                        value={((form.getFieldValue('limit_use_in_categories') as string) || '')
                          .split(',')
                          .filter(Boolean)
                          .map((id) => parseInt(id))}
                        onChange={(value) => form.setFieldsValue({ limit_use_in_categories: [].concat((value as any) || []).join(',') })}
                        multiple
                        categories={categories || []}
                      />
                    )}
                  </Field>
                  <TipIconButton message="设置后，仅能在限定板块内帖子上添加该标签；否则，全部板块可用" />
                </Box>
                <Box display="flex" alignItems="center" mt={1}>
                  <span style={{ flexShrink: 0 }}>限制使用角色：</span>
                  <Field name="limit_use_by_groups" initialValue={threadTag?.limit_use_by_groups || ''}>
                    {() => (
                      <GroupSelect
                        TextFieldProps={{ fullWidth: true }}
                        value={((form.getFieldValue('limit_use_by_groups') as string) || '')
                          .split(',')
                          .filter(Boolean)
                          .map((id) => parseInt(id))}
                        onChange={(value) => form.setFieldsValue({ limit_use_by_groups: [].concat(value as any).join(',') })}
                        multiple
                        groups={allGroups || []}
                      />
                    )}
                  </Field>
                  <TipIconButton message="设置后，额外限制仅指定角色可以添加该标签到帖子上。默认仅 系统管理员 和 帖子作者 可用" />
                </Box>
              </>
            )}
            <Box display="flex" alignItems="center" mt={1}>
              <span style={{ flexShrink: 0 }}>限制浏览帖子角色：</span>
              <Field name="limit_thread_read_groups" initialValue={threadTag?.limit_thread_read_groups || ''}>
                {() => (
                  <GroupSelect
                    TextFieldProps={{ fullWidth: true }}
                    value={((form.getFieldValue('limit_thread_read_groups') as string) || '')
                      .split(',')
                      .filter(Boolean)
                      .map((id) => parseInt(id))}
                    onChange={(value) => form.setFieldsValue({ limit_thread_read_groups: [].concat(value as any).join(',') })}
                    multiple
                    groups={allGroupsWithTourist || []}
                  />
                )}
              </Field>
              <TipIconButton message="设置后，额外限制仅指定角色可以浏览带该标签的帖子。默认有角色权限的用户都可浏览" />
            </Box>
            <Box display="flex" alignItems="center" mt={1}>
              <span style={{ flexShrink: 0 }}>限制编辑帖子角色：</span>
              <Field name="limit_thread_write_groups" initialValue={threadTag?.limit_thread_write_groups || ''}>
                {() => (
                  <GroupSelect
                    TextFieldProps={{ fullWidth: true }}
                    value={((form.getFieldValue('limit_thread_write_groups') as string) || '')
                      .split(',')
                      .filter(Boolean)
                      .map((id) => parseInt(id))}
                    onChange={(value) => form.setFieldsValue({ limit_thread_write_groups: [].concat(value as any).join(',') })}
                    multiple
                    groups={allGroups || []}
                  />
                )}
              </Field>
              <TipIconButton message="设置后，额外限制仅指定角色可以编辑带该标签的帖子。默认 帖子作者 或 有角色权限的用户 可编辑" />
            </Box>
            <Box>
              <Field name="hidden_in_thread_view" initialValue={!!threadTag?.hidden_in_thread_view} valuePropName="checked">
                <FormControlLabel
                  sx={{ ml: 0, mt: 1, mb: 0.5, mr: 2 }}
                  control={<Switch size="small" sx={{ m: 0.5 }} />}
                  label="在帖子列表/详情隐藏"
                  labelPlacement="start"
                />
              </Field>
              <TipIconButton message="隐藏后，帖子列表/详情上不再直接显示该标签" />
            </Box>
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
      message={<EditForm />}
      cancelText="取消"
      onOk={async () => {
        await innerForm.validateFields();
        await doTaskWithUI({
          task: async () => doSubmit(innerForm.getFieldsValue()),
          failAlert: true,
          fullScreenLoading: false,
        });
      }}
    >
      {props.children}
    </OpenAlertDialog>
  );
};

export default OpenEditThreadTagDialog;
