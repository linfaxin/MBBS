import React, { ReactElement, useEffect, useRef, useState } from 'react';
import { AppBar, Dialog, IconButton, Slide, Toolbar, Typography } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useScreenWidthUpMD } from '@/utils/use-screen-width';
import Vditor from 'vditor';
import { TransitionProps } from '@mui/material/transitions';
import MarkdownEditorSubmit from '@/components/vditor/markdown-editor-submit';

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export interface OpenPopupMarkdownEditorProps {
  title?: string;
  defaultValue?: string;
  submitButtonText?: string;
  placeholder?: string;
  onSubmit?: (value: string) => Promise<void | any>;
  onSubmitFailAlert?: boolean;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  handleOpenChange?: (open: boolean) => boolean;
  children?: ReactElement;
  clearAfterSubmit?: boolean;
}

const OpenPopupMarkdownEditor: React.FC<OpenPopupMarkdownEditorProps> = (props) => {
  const {
    title,
    defaultValue,
    submitButtonText = '提交',
    placeholder,
    onSubmit,
    defaultOpen = false,
    open: openProp,
    onOpenChange,
    handleOpenChange,
    clearAfterSubmit = false,
    onSubmitFailAlert = false,
    children,
  } = props;
  const isWidthUpMD = useScreenWidthUpMD();
  const [open, setOpen] = useState(typeof openProp === 'boolean' ? openProp : defaultOpen);
  const inputValueRef = useRef(defaultValue);
  const vditorRef = useRef<Vditor>();

  useEffect(() => {
    if (typeof openProp === 'boolean') setOpen(openProp);
  }, [openProp]);

  const changeOpen = (newOpen: boolean) => {
    if (handleOpenChange) newOpen = Boolean(handleOpenChange(newOpen));
    if (newOpen === open) return;
    if (typeof openProp !== 'boolean') {
      // 非受控模式，直接改内部 state
      setOpen(newOpen);
    }
    if (onOpenChange) onOpenChange(newOpen);
  };

  const doCloseDialog = () => {
    const currentInput = vditorRef.current?.getValue();
    if (currentInput) {
      inputValueRef.current = currentInput;
    }
    changeOpen(false);
  };

  return (
    <>
      {children &&
        React.cloneElement(children, {
          onClick: () => changeOpen(true),
        })}
      <Dialog
        open={open}
        fullScreen={!isWidthUpMD}
        onClose={doCloseDialog}
        maxWidth="sm"
        fullWidth
        TransitionComponent={Transition}
        PaperProps={{
          sx: {
            position: 'absolute',
            right: 0,
            bottom: 0,
            minWidth: '50vw', // 避免大屏窗口显示过小
          },
        }}
      >
        <AppBar position="static" sx={{ flex: 'none' }}>
          <Toolbar>
            <IconButton size="small" edge="start" color="inherit" aria-label="menu" sx={{ mr: 1 }} onClick={doCloseDialog}>
              <KeyboardArrowDownIcon fontSize="large" />
            </IconButton>
            <Typography sx={{ flexGrow: 1 }}>{title}</Typography>
          </Toolbar>
        </AppBar>
        <MarkdownEditorSubmit
          vditor={{ placeholder }}
          afterInit={(v) => (vditorRef.current = v)}
          defaultMarkdown={inputValueRef.current}
          style={{ flex: 1, height: 0, minHeight: '50vh' }}
          failAlert={onSubmitFailAlert}
          submitText={submitButtonText}
          onSubmit={async (inputValue) => {
            if (onSubmit) {
              await onSubmit(inputValue);
            }
            if (clearAfterSubmit) {
              inputValueRef.current = '';
              if (vditorRef.current) vditorRef.current.setValue('');
            }
            doCloseDialog();
          }}
        />
      </Dialog>
    </>
  );
};

export default OpenPopupMarkdownEditor;
