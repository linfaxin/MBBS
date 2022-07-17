import React, { useMemo, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from '@mui/material';
import LoadingButton from '@mui/lab/LoadingButton';
import { Breakpoint } from '@mui/system';
import { HexColorPicker, RgbaStringColorPicker } from 'react-colorful';
import { TextFieldProps } from '@mui/material/TextField/TextField';
import { showErrorAlert } from '@/utils/show-alert';
import renderInExtra from '@/utils/render-in-extra';
import { formatHexColor, formatRgbaColor } from '@/utils/format-util';

export interface OpenColorPickerDialogProps {
  title?: string;
  description?: string;
  inputLabel?: string;
  defaultColor?: string;
  onSubmit: (color: string) => void | Promise<void>;
  submitFailAlert?: boolean;
  maxDialogWidth?: Breakpoint | false;
  TextFieldProps?: TextFieldProps;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  alpha?: boolean;
}

const OpenColorPickerDialog: React.FC<
  OpenColorPickerDialogProps & {
    children?: React.ReactElement;
  }
> = (props) => {
  const {
    title = '请输入',
    description,
    defaultColor = '#ffffff',
    onSubmit,
    submitFailAlert,
    maxDialogWidth = 'xs',
    inputLabel,
    TextFieldProps,
    defaultOpen = false,
    onOpenChange,
    alpha,
    children,
  } = props;
  const [open, setOpen] = useState(defaultOpen);
  const [color, setColor] = useState(defaultColor);
  const [submitting, setSubmitting] = useState(false);
  const validationError = useMemo(() => {
    if (!color) return '';
    if (alpha && formatRgbaColor(color.trim())) return '';
    if (formatHexColor(color.trim())) return '';
    return '颜色格式错误';
  }, [color, alpha]);

  const changeOpen = (open: boolean) => {
    setOpen(open);
    if (onOpenChange) onOpenChange(open);
  };

  const doCloseDialog = () => {
    changeOpen(false);
  };

  const onOkClick = async () => {
    if (validationError) return;
    setSubmitting(true);
    try {
      await onSubmit((color || '').trim());
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
            setColor(defaultColor);
            changeOpen(true);
          },
        })}
      <Dialog open={open} onClose={doCloseDialog} fullWidth maxWidth={maxDialogWidth}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{description}</DialogContentText>
          {alpha ? (
            <RgbaStringColorPicker color={formatRgbaColor(color)} onChange={setColor} style={{ margin: 'auto' }} />
          ) : (
            <HexColorPicker color={formatHexColor(color)} onChange={setColor} style={{ margin: 'auto' }} />
          )}
          <TextField
            {...TextFieldProps}
            autoFocus={false}
            margin="dense"
            label={inputLabel}
            disabled={submitting}
            fullWidth
            variant="standard"
            value={color}
            error={!!validationError}
            helperText={validationError}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                onOkClick();
              }
            }}
            onChange={(e) => {
              setColor(e.target.value);
            }}
          />
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

export function showColorPickerDialog(props: OpenColorPickerDialogProps) {
  const doUnmount = renderInExtra(
    <OpenColorPickerDialog
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

export default OpenColorPickerDialog;
