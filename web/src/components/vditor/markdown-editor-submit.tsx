import React, { useRef } from 'react';
import MarkdownEditor, { MarkdownEditorProps } from '@/components/vditor/markdown-editor';
import Vditor from 'vditor';
import DoTaskButton from '@/components/do-task-button';
import { useTheme } from '@mui/material';

export declare type MarkdownEditorSubmitProps = {
  submitText?: string;
  cancelText?: string;
  failAlert?: boolean;
  onSubmit: (markdown: string) => Promise<void | any>;
  onCancel?: (markdown: string) => Promise<void | any>;
  onCancelFailAlert?: boolean;
} & Omit<MarkdownEditorProps, 'onSubmit'>;

const MarkdownEditorSubmit: React.FC<MarkdownEditorSubmitProps> = (props) => {
  const {
    submitText = '提交',
    failAlert,
    onSubmit,
    cancelText,
    onCancel,
    renderActions,
    onCancelFailAlert = failAlert,
    ...otherProps
  } = props;
  const theme = useTheme();
  const vditorRef = useRef<Vditor>();

  return (
    <MarkdownEditor
      {...otherProps}
      vditor={{
        ...otherProps.vditor,
        afterInit: (vditor) => {
          vditorRef.current = vditor;
          if (otherProps.vditor?.afterInit) {
            otherProps.vditor.afterInit(vditor);
          }
        },
      }}
      renderActions={
        <>
          {typeof renderActions === 'function' ? renderActions() : renderActions}
          {cancelText && (
            <DoTaskButton
              variant="contained"
              size="large"
              sx={{
                borderRadius: '100vh',
                background: theme.palette.grey['200'],
                color: theme.palette.grey['700'],
                boxShadow: theme.shadows[5],
                mr: 1,
                pl: 2,
                pr: 2,
                minWidth: 80,
              }}
              failAlert={onCancelFailAlert}
              task={async () => {
                if (!onCancel) return;
                let inputValue = vditorRef.current ? vditorRef.current.getValue() : otherProps.defaultMarkdown;
                await onCancel(inputValue || '');
              }}
            >
              {cancelText}
            </DoTaskButton>
          )}
          <DoTaskButton
            variant="contained"
            size="large"
            sx={{
              borderRadius: '100vh',
              boxShadow: theme.shadows[5],
              pl: 2,
              pr: 2,
              minWidth: 80,
            }}
            failAlert={failAlert}
            task={async () => {
              let inputValue = vditorRef.current ? vditorRef.current.getValue() : otherProps.defaultMarkdown;
              await onSubmit(inputValue || '');
            }}
          >
            {submitText}
          </DoTaskButton>
        </>
      }
    />
  );
};

export default MarkdownEditorSubmit;
