import React from 'react';
import OpenAlertDialog, { OpenAlertDialogProps } from '@/components/open-alert-dialog';
import { Box, TextField, Button, Typography } from '@mui/material';
import doTaskWithUI from '@/utils/do-task-with-ui';
import Form, { Field } from 'rc-field-form';
import { FormInstance } from 'rc-field-form/es/interface';
import { getResourceUrl } from '@/utils/resource-url';
import { compressImageFile } from '@/utils/compress-image-util';
import UploadResourceButton from '@/components/upload-resource-button';
import { Group } from '@/api/group';
import TipIconButton from '@/components/tip-icon-button';

const OpenEditGroupDialog: React.FC<
  Partial<OpenAlertDialogProps> & {
    group?: Group;
    doSubmitGroup: (fields: Pick<Group, 'name' | 'icon'>) => void | Promise<void>;
  }
> = (props) => {
  const { group, doSubmitGroup, ...otherProps } = props;

  let innerForm: FormInstance;
  const EditGroupForm = () => {
    const [form] = Form.useForm();
    innerForm = form;
    return (
      <Form form={form}>
        {() => (
          <>
            <Field name="name" initialValue={group?.name || ''} rules={[{ required: true, message: '请输入' }]}>
              <TextField
                margin="dense"
                label="角色名称"
                placeholder="请输入"
                size="small"
                fullWidth
                variant="outlined"
                error={!!form.getFieldError('name')?.length}
                helperText={(form.getFieldError('name') || [])[0]}
                sx={{ marginTop: 1 }}
              />
            </Field>
            <Field name="icon" initialValue={group?.icon || ''}>
              {() => (
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <TipIconButton message="设置角色图标后，该角色下所有用户的昵称边将会出现该图标" />
                  <Typography fontSize={13}>角色图标：</Typography>
                  {form.getFieldValue('icon') ? (
                    <img alt="icon" src={getResourceUrl(form.getFieldValue('icon'))} style={{ width: 40, height: 40 }} />
                  ) : (
                    <Typography fontSize={13}>无</Typography>
                  )}
                  <UploadResourceButton
                    sx={{ marginLeft: 2 }}
                    beforeUpload={(file) => compressImageFile(file, { maxWidth: 64, maxHeight: 64, mimeType: 'image/png' })}
                    onUploaded={async (result) => {
                      form.setFieldsValue({ icon: result.filePath });
                    }}
                  >
                    上传图标
                  </UploadResourceButton>
                  {form.getFieldValue('icon') && <Button onClick={() => form.setFieldsValue({ icon: '' })}>删除</Button>}
                </Box>
              )}
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
      message={<EditGroupForm />}
      cancelText="取消"
      onOk={async () => {
        await innerForm.validateFields();
        await doTaskWithUI({
          task: async () => doSubmitGroup(innerForm.getFieldsValue()),
          failAlert: true,
          fullScreenLoading: false,
        });
      }}
    >
      {props.children}
    </OpenAlertDialog>
  );
};

export default OpenEditGroupDialog;
