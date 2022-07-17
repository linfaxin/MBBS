import React, { useRef, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, MenuItem, TextField } from '@mui/material';
import LoadingButton from '@mui/lab/LoadingButton';
import { Breakpoint } from '@mui/system';
import { TextFieldProps } from '@mui/material/TextField/TextField';
import { showErrorAlert } from '@/utils/show-alert';

export interface OpenPromptDialogProps {
  title?: string;
  description?: string;
  inputLabel?: string;
  defaultValue?: string;
  multiline?: boolean;
  maxInputLength?: number;
  onSubmit: (input: string) => void | Promise<void>;
  submitFailAlert?: boolean;
  maxDialogWidth?: Breakpoint | false;
  options?: Array<string | { label: string; value: string }>;
  TextFieldProps?: TextFieldProps;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  maskCancel?: boolean;
  handleOpenChange?: (open: boolean) => boolean;
}

const OpenPromptDialog: React.FC<
  OpenPromptDialogProps & {
    children?: React.ReactElement;
  }
> = (props) => {
  const {
    title = '请输入',
    description,
    defaultValue,
    maxInputLength,
    multiline,
    onSubmit,
    submitFailAlert,
    maxDialogWidth = 'sm',
    options = [],
    inputLabel = options.length ? '请选择' : undefined,
    TextFieldProps,
    defaultOpen = false,
    onOpenChange,
    handleOpenChange,
    maskCancel = false, // 点击阴影 弹窗是否消息
    children,
  } = props;
  const [open, setOpen] = useState(defaultOpen);
  const [validationError, setValidationError] = useState('');
  const inputValueRef = useRef(defaultValue);
  const [submitting, setSubmitting] = useState(false);

  const changeOpen = (newOpen: boolean) => {
    if (handleOpenChange) newOpen = Boolean(handleOpenChange(newOpen));
    if (newOpen === open) return;
    setOpen(newOpen);
    if (onOpenChange) onOpenChange(newOpen);
  };

  const doCloseDialog = () => {
    changeOpen(false);
  };

  const onOkClick = async () => {
    setSubmitting(true);
    try {
      await onSubmit(inputValueRef.current || '');
      doCloseDialog();
    } catch (e: any) {
      console.warn(e);
      if (submitFailAlert) {
        showErrorAlert(e?.message || String(e));
      }
    }
    setSubmitting(false);
  };

  return (
    <>
      {children &&
        React.cloneElement(children, {
          onClick: () => {
            inputValueRef.current = defaultValue;
            changeOpen(true);
          },
        })}
      <Dialog open={open} onClose={maskCancel ? doCloseDialog : undefined} fullWidth maxWidth={maxDialogWidth}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{description}</DialogContentText>
          <TextField
            {...TextFieldProps}
            autoFocus={!options.length}
            margin="dense"
            multiline={multiline}
            label={inputLabel}
            disabled={submitting}
            fullWidth
            select={!!options.length}
            variant="standard"
            autoComplete="off"
            defaultValue={inputValueRef.current || ''}
            error={!!validationError}
            helperText={validationError}
            onKeyPress={(e) => {
              if (!multiline && e.key === 'Enter') {
                onOkClick();
              }
            }}
            onChange={(e) => {
              inputValueRef.current = e.target.value;
              if (maxInputLength && inputValueRef.current?.length > maxInputLength) {
                setValidationError(`最多输入 ${maxInputLength} 个字符`);
              } else if (validationError) {
                setValidationError('');
              }
            }}
          >
            {options.map((item) => (
              <MenuItem key={typeof item === 'string' ? item : item.value} value={typeof item === 'string' ? item : item.value}>
                {typeof item === 'string' ? item : item.label}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={doCloseDialog}>取消</Button>
          <LoadingButton loading={submitting} disabled={!!validationError} variant="outlined" onClick={onOkClick}>
            确定
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default OpenPromptDialog;
