import React, { ReactNode, useEffect, useState } from 'react';
import { Button, IconButton, Snackbar } from '@mui/material';
import renderInExtra from '@/utils/render-in-extra';
import CloseIcon from '@mui/icons-material/Close';

export default function showSnackbar(
  options:
    | string
    | {
        message: ReactNode;
        autoHideDuration?: number;
        closeable?: boolean;
        actionText?: string;
        onAction?: () => void;
      },
): () => void {
  if (typeof options === 'string') {
    options = { message: options };
  }
  const { message, autoHideDuration = 2000, closeable = false, actionText, onAction } = options;

  let doMount: () => void;

  const ShowSnackbar = () => {
    const [open, setOpen] = useState(true);

    const doCloseSnackbar = () => {
      setOpen(false);
      setTimeout(doMount, 500); // 消息条消失动画结束后，unmount 节点
    };

    useEffect(() => {
      if (autoHideDuration) {
        setTimeout(doCloseSnackbar, autoHideDuration);
      }
    }, []);

    const action = (
      <React.Fragment>
        {actionText && (
          <Button color="secondary" size="small" onClick={onAction}>
            {actionText}
          </Button>
        )}
        {closeable && (
          <IconButton size="small" aria-label="close" color="inherit" onClick={doCloseSnackbar}>
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
      </React.Fragment>
    );

    return (
      <Snackbar
        open={open}
        onClose={doCloseSnackbar}
        message={<div style={{ maxWidth: 300 }}>{message}</div>}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        action={action}
      />
    );
  };

  doMount = renderInExtra(<ShowSnackbar />);

  return doMount;
}
