import React, { useState } from 'react';
import OpenAlertDialog, { OpenAlertDialogProps } from '@/components/open-alert-dialog';
import { TextField } from '@mui/material';
import Form, { Field } from 'rc-field-form';
import { FormInstance } from 'rc-field-form/es/interface';
import renderInExtra from '@/utils/render-in-extra';
import { appendHttpPrefixForInputUrl } from '@/utils/url-util';

export declare type OpenEditLinkDialog = Partial<Omit<OpenAlertDialogProps, 'onOk'>> & {
  defaultValue?: {
    text?: string;
    link?: string;
  };
  onOk: (value: { text: string; link: string }) => void | Promise<any>;
};

const OpenEditLinkDialog: React.FC<OpenEditLinkDialog> = (props) => {
  const { defaultValue, onOk, ...otherProps } = props;
  let innerForm: FormInstance;
  const DialogForm = () => {
    const [form] = Form.useForm();
    innerForm = form;
    return (
      <Form form={form}>
        {() => (
          <>
            <Field name="text" rules={[{ required: true, message: '请输入链接文字' }]} initialValue={defaultValue?.text || ''}>
              <TextField
                margin="dense"
                label="链接文字"
                placeholder="请输入"
                fullWidth
                variant="outlined"
                error={!!form.getFieldError('text')?.length}
                helperText={(form.getFieldError('text') || [])[0]}
                sx={{ marginTop: 2 }}
              />
            </Field>
            <Field name="link" rules={[{ required: true, message: '请输入链接地址' }]} initialValue={defaultValue?.link || ''}>
              <TextField
                margin="dense"
                label="链接地址"
                placeholder="请输入"
                fullWidth
                variant="outlined"
                error={!!form.getFieldError('link')?.length}
                helperText={(form.getFieldError('link') || [])[0]}
                sx={{ marginTop: 2 }}
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
        if (open) {
          innerForm.resetFields();
        }
      }}
      maxDialogWidth="xs"
      fullWidth
      message={<DialogForm />}
      cancelText="取消"
      onOk={async () => {
        await innerForm.validateFields();
        await onOk({
          text: innerForm.getFieldValue('text'),
          link: appendHttpPrefixForInputUrl(innerForm.getFieldValue('link')),
        });
      }}
    >
      {props.children}
    </OpenAlertDialog>
  );
};

export function showOpenEditLinkDialog(props: OpenEditLinkDialog) {
  const doUnmount = renderInExtra(
    <OpenEditLinkDialog
      {...props}
      defaultOpen
      onOpenChange={(open) => {
        if (!open) {
          setTimeout(() => {
            setTimeout(doUnmount, 500); // 对话框隐藏动画后再 unmount
          }, 500);
        }
        if (props.onOpenChange) {
          props.onOpenChange(open);
        }
      }}
    />,
  );
  return doUnmount;
}

export default OpenEditLinkDialog;
