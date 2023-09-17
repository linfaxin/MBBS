import showPromptDialog from '@/utils/show-prompt-dialog';
import { userApi } from '@/api';
import showSnackbar from '@/utils/show-snackbar';
import { User } from '@/api/base/user';
import { showErrorAlert } from '@/utils/show-alert';

export default function showBindEmailDialog(option: { onSuc?: () => void }) {
  const { onSuc } = option;
  showPromptDialog({
    title: '设置绑定邮箱',
    inputLabel: '邮箱地址',
    maxInputLength: 100,
    submitFailAlert: true,
    description: '确定后将发送 绑定验证码 到该邮箱地址',
    onSubmit: async (email) => {
      if (!email) {
        throw new Error('请输入要绑定的邮箱');
      }
      await userApi.sendBindEmailVerifyCode({ email });
      showPromptDialog({
        title: '请输入收到的验证码',
        inputLabel: '验证码',
        description: '已发送 验证码邮件 至该邮箱地址',
        submitFailAlert: true,
        onSubmit: async (verifyCode) => {
          await userApi.bindEmail({ email, verify_code: verifyCode });
          onSuc?.();
          showSnackbar('绑定邮箱成功');
        },
      });
    },
  });
}

export function setMessageSyncToEmailEnable(loginUser: User, enable: boolean, onSuc?: () => void) {
  if (!loginUser) {
    return showSnackbar('请先登录');
  }

  const doSetMsgToEmail = async () => {
    try {
      await userApi.enableMsgToEmail(enable);
      onSuc?.();
    } catch (e: any) {
      showErrorAlert(e.message || String(e));
    }
  };

  if (!loginUser.email) {
    showBindEmailDialog({ onSuc: doSetMsgToEmail });
  } else {
    doSetMsgToEmail();
  }
}
