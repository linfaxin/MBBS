import React, { useState } from 'react';
import OpenAlertDialog, { OpenAlertDialogProps } from '@/components/open-alert-dialog';
import { IconButton, InputAdornment, TextField } from '@mui/material';
import { userApi } from '@/api';
import doTaskWithUI from '@/utils/do-task-with-ui';
import showSnackbar from '@/utils/show-snackbar';
import Form, { Field } from 'rc-field-form';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { FormInstance, RuleObject } from 'rc-field-form/es/interface';

const OpenChangePasswordDialog: React.FC<Partial<OpenAlertDialogProps>> = (props) => {
  let innerForm: FormInstance;
  const ChangePasswordForm = () => {
    const [form] = Form.useForm();
    innerForm = form;
    const [showPassword, setShowPassword] = useState(false);
    return (
      <Form form={form}>
        {() => (
          <>
            <Field name="current-password" rules={[{ required: true, message: '请输入原密码' }]} initialValue="">
              <TextField
                margin="dense"
                label="原密码"
                placeholder="请输入"
                fullWidth
                variant="outlined"
                name="current-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                error={!!form.getFieldError('current-password')?.length}
                helperText={(form.getFieldError('current-password') || [])[0]}
                sx={{ marginTop: 2 }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="start">
                      <IconButton onClick={() => setShowPassword(!showPassword)} onMouseDown={(e) => e.preventDefault()} edge="end">
                        {showPassword ? <Visibility /> : <VisibilityOff />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Field>
            <Field name="new-password" rules={[{ required: true, message: '请输入新密码' }]} initialValue="">
              <TextField
                margin="dense"
                label="新密码"
                placeholder="请输入"
                fullWidth
                variant="outlined"
                name="new-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                error={!!form.getFieldError('new-password')?.length}
                helperText={(form.getFieldError('new-password') || [])[0]}
                sx={{ marginTop: 2 }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="start">
                      <IconButton onClick={() => setShowPassword(!showPassword)} onMouseDown={(e) => e.preventDefault()} edge="end">
                        {showPassword ? <Visibility /> : <VisibilityOff />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Field>
            <Field
              name="repeat-password"
              rules={[
                { required: true, message: '请重复输入新密码' },
                {
                  validator: async (rule: RuleObject, value: any) => {
                    if (value !== form.getFieldValue('new-password')) {
                      throw new Error('两次输入密码不一致');
                    }
                  },
                },
              ]}
              initialValue=""
              validateTrigger={form.getFieldError('repeat-password')?.length ? 'onChange' : 'onBlur'}
            >
              <TextField
                margin="dense"
                label="重复密码"
                placeholder="请重复输入新密码"
                fullWidth
                variant="outlined"
                name="repeat-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                error={!!form.getFieldError('repeat-password')?.length}
                helperText={(form.getFieldError('repeat-password') || [])[0]}
                sx={{ marginTop: 2 }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="start">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        onMouseDown={(e) => e.preventDefault()}
                        edge="end"
                      >
                        {showPassword ? <Visibility /> : <VisibilityOff />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Field>
          </>
        )}
      </Form>
    );
  };

  return (
    <OpenAlertDialog
      {...props}
      onOpenChange={(open) => {
        if (!open) {
          innerForm.resetFields();
        }
      }}
      maxDialogWidth="xs"
      fullWidth
      message={<ChangePasswordForm />}
      cancelText="取消"
      onOk={async () => {
        await innerForm.validateFields();
        await doTaskWithUI({
          task: () =>
            userApi.changePassword({
              old_password: innerForm.getFieldValue('current-password'),
              new_password: innerForm.getFieldValue('new-password'),
            }),
          failAlert: true,
          fullScreenLoading: false,
        });
        showSnackbar('密码修改成功');
      }}
    >
      {props.children}
    </OpenAlertDialog>
  );
};

export default OpenChangePasswordDialog;
