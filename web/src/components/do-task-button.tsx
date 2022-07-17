import React, { useState } from 'react';
import { LoadingButton } from '@mui/lab';
import { LoadingButtonProps } from '@mui/lab/LoadingButton/LoadingButton';
import { showErrorAlert } from '@/utils/show-alert';

const DoTaskButton: React.FC<
  {
    task: () => Promise<any>;
    failAlert?: boolean;
  } & LoadingButtonProps
> = (props) => {
  const { task, failAlert, ...buttonProps } = props;
  const [loading, setLoading] = useState(false);
  return (
    <LoadingButton
      {...buttonProps}
      loading={loading}
      onClick={async () => {
        setLoading(true);
        try {
          await task();
        } catch (e) {
          console.warn(e);
          if (failAlert) {
            showErrorAlert(e?.message || String(e));
          }
        } finally {
          setLoading(false);
        }
      }}
    >
      {props.children}
    </LoadingButton>
  );
};

export default DoTaskButton;
