import showFullScreenLoading from '@/utils/show-full-screen-loading';
import showSnackbar from '@/utils/show-snackbar';
import showAlert from '@/utils/show-alert';

export default async function doTaskWithUI<T>(options: {
  task: () => Promise<T>;
  fullScreenLoading?: boolean;
  failSnackbar?: boolean;
  failAlert?: boolean;
  failRetry?: boolean;
}): Promise<T> {
  let result: T;
  const { task, fullScreenLoading = true, failAlert, failSnackbar = !failAlert, failRetry } = options;

  let hideFullScreenLoading = fullScreenLoading ? showFullScreenLoading() : null;

  try {
    result = await task();

    if (hideFullScreenLoading) {
      hideFullScreenLoading();
    }
    return result;
  } catch (e: any) {
    const errMessage = e?.message || String(e);
    if (failSnackbar) {
      const hideSnackbar = showSnackbar({
        message: errMessage,
        actionText: failRetry ? '重试' : undefined,
        onAction: () => {
          hideSnackbar();
          doTaskWithUI(options);
        },
      });
    }
    if (failAlert) {
      showAlert({
        title: '出错',
        message: errMessage,
        cancelText: failRetry ? '重试' : undefined,
        onCancel: async () => {
          await doTaskWithUI({
            ...options,
            failRetry: false,
            failAlert: false,
            failSnackbar: true,
          });
        },
        okText: '关闭',
      });
    }

    if (hideFullScreenLoading) {
      hideFullScreenLoading();
    }

    throw e;
  }
}
