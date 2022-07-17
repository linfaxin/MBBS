import React from 'react';
import { Backdrop, CircularProgress } from '@mui/material';
import renderInExtra from '@/utils/render-in-extra';

const unmountFuncs = new Set<Function>();

export default function showFullScreenLoading(options?: { delay?: number }): () => void {
  const { delay = 300 } = options || {};
  let doUnmount: () => void;
  const timeoutId = setTimeout(() => {
    doUnmount = renderInExtra(
      <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.modal + 1 }} open>
        <CircularProgress color="inherit" />
      </Backdrop>,
    );
  }, delay);

  const unmountFunc = () => {
    unmountFuncs.delete(unmountFunc);
    clearTimeout(timeoutId);
    if (doUnmount) doUnmount();
  };
  unmountFuncs.add(unmountFunc);
  return unmountFunc;
}

export function hideFullScreenLoading() {
  unmountFuncs.forEach((f) => f());
}
