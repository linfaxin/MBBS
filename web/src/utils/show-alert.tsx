import React from 'react';
import renderInExtra from '@/utils/render-in-extra';
import OpenAlertDialog, { OpenAlertDialogProps } from '@/components/open-alert-dialog';
import { hideFullScreenLoading } from '@/utils/show-full-screen-loading';

export default function showAlert(options: string | OpenAlertDialogProps): () => void {
  hideFullScreenLoading();
  const props: OpenAlertDialogProps = typeof options === 'string' ? { message: options } : options;

  let doUnmount: () => void;

  doUnmount = renderInExtra(
    <OpenAlertDialog
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

export function showErrorAlert(options: string | OpenAlertDialogProps): () => void {
  const props: OpenAlertDialogProps = typeof options === 'string' ? { message: options } : options;
  return showAlert({
    title: '错误',
    ...props,
  });
}

export function showConfirm(options: string | OpenAlertDialogProps): () => void {
  const props: OpenAlertDialogProps = typeof options === 'string' ? { message: options } : options;
  return showAlert({
    cancelText: '取消',
    ...props,
  });
}
