import React, { ReactNode, useState } from 'react';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton } from '@mui/material';
import LoadingButton from '@mui/lab/LoadingButton';
import CloseIcon from '@mui/icons-material/Close';
import { Breakpoint } from '@mui/system';
import showAlert from '@/utils/show-alert';

export interface OpenAlertDialogProps {
  title?: ReactNode;
  message: ReactNode;
  okText?: ReactNode;
  onOk?: () => void | Promise<void>;
  onOkErrorAlert?: boolean;
  cancelText?: ReactNode;
  onCancelErrorAlert?: boolean;
  onCancel?: () => void | Promise<void>;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  maskCancel?: boolean;
  maxDialogWidth?: Breakpoint | false;
  fullWidth?: boolean;
  closeIcon?: boolean;
  children?: React.ReactElement;
}

const OpenAlertDialog: React.FC<OpenAlertDialogProps> = (props) => {
  const {
    title,
    message,
    okText = '确定',
    onOk,
    cancelText,
    onCancel,
    defaultOpen = false,
    onOkErrorAlert = false,
    onCancelErrorAlert = onOkErrorAlert,
    maxDialogWidth = 'md',
    fullWidth,
    onOpenChange,
    closeIcon,
    maskCancel = false, // 点击阴影 弹窗是否消息
    children,
  } = props;
  const [open, setOpen] = useState(defaultOpen);
  const [cancelLoading, setCancelButtonLoading] = useState(false);
  const [okLoading, setOkButtonLoading] = useState(false);

  const changeOpen = (open: boolean) => {
    setOpen(open);
    if (onOpenChange) onOpenChange(open);
  };

  const doCloseDialog = () => {
    changeOpen(false);
  };

  return (
    <>
      {children &&
        React.cloneElement(children, {
          onClick: () => changeOpen(true),
        })}
      <Dialog open={open} onClose={maskCancel ? doCloseDialog : undefined} maxWidth={maxDialogWidth} fullWidth={fullWidth}>
        {closeIcon && (
          <IconButton
            onClick={doCloseDialog}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              opacity: 0.7,
              zIndex: 1,
            }}
          >
            <CloseIcon />
          </IconButton>
        )}
        {title && <DialogTitle>{title}</DialogTitle>}
        <DialogContent sx={{ minWidth: Math.min(320, document.body.offsetWidth - 120) }}>
          {typeof message === 'string' ? (
            <DialogContentText whiteSpace="pre-wrap" sx={{ wordBreak: 'break-all' }}>
              {message}
            </DialogContentText>
          ) : (
            message
          )}
        </DialogContent>
        {(cancelText || okText) && (
          <DialogActions>
            {cancelText && (
              <LoadingButton
                loading={cancelLoading}
                disabled={cancelLoading || okLoading}
                onClick={
                  onCancel
                    ? async () => {
                        setCancelButtonLoading(true);
                        try {
                          await onCancel();
                          doCloseDialog();
                        } catch (e: any) {
                          if (onCancelErrorAlert) {
                            showAlert(e?.message || String(e));
                          }
                        }
                        setCancelButtonLoading(false);
                      }
                    : doCloseDialog
                }
              >
                {cancelText}
              </LoadingButton>
            )}
            {okText && (
              <LoadingButton
                loading={okLoading}
                disabled={cancelLoading || okLoading}
                onClick={
                  onOk
                    ? async () => {
                        setOkButtonLoading(true);
                        try {
                          await onOk();
                          doCloseDialog();
                        } catch (e: any) {
                          if (onOkErrorAlert) {
                            showAlert(e?.message || String(e));
                          }
                        }
                        setOkButtonLoading(false);
                      }
                    : doCloseDialog
                }
              >
                {okText}
              </LoadingButton>
            )}
          </DialogActions>
        )}
      </Dialog>
    </>
  );
};

export default OpenAlertDialog;
