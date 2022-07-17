import React from 'react';
import renderInExtra from '@/utils/render-in-extra';
import OpenPromptDialog, { OpenPromptDialogProps } from '@/components/open-prompt-dialog';
import { hideFullScreenLoading } from '@/utils/show-full-screen-loading';

export default function showPromptDialog(options: OpenPromptDialogProps): () => void {
  hideFullScreenLoading();
  let doUnmount: () => void;

  doUnmount = renderInExtra(
    <OpenPromptDialog
      {...options}
      defaultOpen
      onOpenChange={(open) => {
        if (!open) {
          setTimeout(() => {
            setTimeout(doUnmount, 500); // 对话框隐藏动画后再 unmount
          }, 500);
        }
        if (options.onOpenChange) {
          options.onOpenChange(open);
        }
      }}
    />,
  );
  return doUnmount;
}
