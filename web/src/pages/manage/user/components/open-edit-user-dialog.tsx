import React from 'react';
import OpenAlertDialog, { OpenAlertDialogProps } from '@/components/open-alert-dialog';
import { Box, MenuItem, TextField } from '@mui/material';
import { groupApi, userApi } from '@/api';
import doTaskWithUI from '@/utils/do-task-with-ui';
import showSnackbar from '@/utils/show-snackbar';
import Form, { Field } from 'rc-field-form';
import { FormInstance } from 'rc-field-form/es/interface';
import { User, UserStatus } from '@/api/base/user';
import { getResourceUrl } from '@/utils/resource-url';
import { compressImageFile } from '@/utils/compress-image-util';
import UploadResourceButton from '@/components/upload-resource-button';
import { useRequest } from 'ahooks';
import { UserStatusCanChangeToMap } from '@/consts';

const ENUM_MAP_USER_STATE: Record<UserStatus, string> = {
  [UserStatus.Normal]: '正常',
  [UserStatus.Disabled]: '禁用',
  [UserStatus.Checking]: '审核中',
  [UserStatus.CheckFail]: '审核拒绝',
  [UserStatus.CheckIgnore]: '审核拒绝',
};

const OpenEditUserDialog: React.FC<
  Partial<OpenAlertDialogProps> & {
    user: User;
    onUserEdit: (newUser: User) => void | Promise<void>;
  }
> = (props) => {
  const { user, onUserEdit, ...otherProps } = props;

  const { data: groups } = useRequest(() => groupApi.listGroup());
  let innerForm: FormInstance;
  const EditUserForm = () => {
    const [form] = Form.useForm();
    innerForm = form;
    return (
      <Form form={form}>
        {() => (
          <>
            <Field name="avatar" initialValue={user.avatar || ''}>
              {() => (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <img
                    alt="avatar"
                    src={getResourceUrl(form.getFieldValue('avatar')) || require('@/images/default-avatar.png')}
                    style={{ width: 80, height: 80 }}
                  />
                  <UploadResourceButton
                    sx={{ marginLeft: 2 }}
                    beforeUpload={(file) => compressImageFile(file, { maxWidth: 192, maxHeight: 192, mimeType: 'image/png' })}
                    onUploaded={async (result) => {
                      form.setFieldsValue({ avatar: result.filePath });
                    }}
                  >
                    上传新头像
                  </UploadResourceButton>
                </Box>
              )}
            </Field>
            <Field name="nickname" initialValue={user.nickname || ''}>
              <TextField
                margin="dense"
                label="昵称"
                placeholder="请输入"
                fullWidth
                variant="outlined"
                error={!!form.getFieldError('nickname')?.length}
                helperText={(form.getFieldError('nickname') || [])[0]}
                sx={{ marginTop: 2 }}
              />
            </Field>
            <Field name="signature" initialValue={user.signature || ''}>
              <TextField
                margin="dense"
                label="个性签名"
                placeholder="请输入"
                fullWidth
                variant="outlined"
                multiline
                error={!!form.getFieldError('signature')?.length}
                helperText={(form.getFieldError('signature') || [])[0]}
                sx={{ marginTop: 2 }}
              />
            </Field>
            <Field name="group_id" rules={[{ required: true, message: '请选择一个角色' }]} initialValue={user.group?.id || ''}>
              <TextField
                margin="dense"
                label="角色"
                placeholder="请选择"
                fullWidth
                variant="outlined"
                select
                error={!!form.getFieldError('group_id')?.length}
                helperText={(form.getFieldError('group_id') || [])[0]}
                sx={{ marginTop: 2 }}
              >
                {(groups || []).map((group) => (
                  <MenuItem key={group.id} value={group.id}>
                    {group.name}
                  </MenuItem>
                ))}
              </TextField>
            </Field>
            <Field name="status" rules={[{ required: true, message: '请选择一个用户状态' }]} initialValue={String(user.status)}>
              <TextField
                margin="dense"
                label="状态"
                placeholder="请选择"
                fullWidth
                select
                variant="outlined"
                error={!!form.getFieldError('status')?.length}
                helperText={(form.getFieldError('status') || [])[0]}
                sx={{ marginTop: 2 }}
              >
                {(UserStatusCanChangeToMap[user.status] || Object.keys(ENUM_MAP_USER_STATE)).map((newState) => (
                  <MenuItem key={newState} value={newState}>
                    {ENUM_MAP_USER_STATE[newState].replace(/^正常$/, user.status === UserStatus.Checking ? '正常（审核通过）' : '正常')}
                  </MenuItem>
                ))}
              </TextField>
            </Field>
            {[UserStatus.CheckFail, UserStatus.Disabled].includes(form.getFieldValue('status')) && (
              <Field name="reject_reason" initialValue={user.reject_reason || ''}>
                <TextField
                  margin="dense"
                  label={form.getFieldValue('status') === UserStatus.CheckFail ? '审核失败说明' : '禁用说明'}
                  placeholder="请输入"
                  fullWidth
                  variant="outlined"
                  error={!!form.getFieldError('reject_reason')?.length}
                  helperText={(form.getFieldError('reject_reason') || [])[0]}
                  sx={{ marginTop: 2 }}
                />
              </Field>
            )}
          </>
        )}
      </Form>
    );
  };

  return (
    <OpenAlertDialog
      title={`修改用户：${user.username}`}
      {...otherProps}
      onOpenChange={(open) => {
        if (!open) {
          innerForm.resetFields();
        }
      }}
      maxDialogWidth="xs"
      fullWidth
      message={<EditUserForm />}
      cancelText="取消"
      onOk={async () => {
        await innerForm.validateFields();
        await doTaskWithUI({
          task: () =>
            userApi
              .modifyUser({
                id: user.id,
                ...innerForm.getFieldsValue(),
              })
              .then(onUserEdit),
          failAlert: true,
          fullScreenLoading: false,
        });
        showSnackbar('修改成功');
      }}
    >
      {props.children}
    </OpenAlertDialog>
  );
};

export default OpenEditUserDialog;
