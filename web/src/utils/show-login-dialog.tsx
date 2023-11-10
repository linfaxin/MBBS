import React, { useEffect, useState } from 'react';
import { Box, Button, IconButton, InputAdornment, Tab, Tabs, TextField, Typography } from '@mui/material';
import Form, { Field } from 'rc-field-form';
import showAlert, { showErrorAlert } from '@/utils/show-alert';
import { setLoginUser, User, UserStatus } from '@/api/base/user';
import QueryString from 'querystring';
import { LoadingButton } from '@mui/lab';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import LockIcon from '@mui/icons-material/Lock';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { loginApi, settingApi, userApi } from '@/api';
import showSnackbar from '@/utils/show-snackbar';
import { useRequest } from 'ahooks';
import { RuleObject } from 'rc-field-form/es/interface';
import ApiUI from '@/api-ui';
import MarkdownPreview from '@/components/vditor/markdown-preview';
import { hideFullScreenLoading } from '@/utils/show-full-screen-loading';
import { isInAlipayMiniApp, isInWechatMiniApp } from '@/utils/platform-util';
import showPromptDialog from '@/utils/show-prompt-dialog';

let showLoginDialogPromise: null | Promise<User | null>;
export default function showLoginDialog(option?: { closeIcon?: boolean }): Promise<User | null> {
  hideFullScreenLoading();
  if (showLoginDialogPromise) {
    return showLoginDialogPromise;
  }
  const { closeIcon = true } = option || {};
  showLoginDialogPromise = new Promise<User | null>(async (resolve) => {
    const bbsSetting = await settingApi.getAll();
    let doUnmount: () => void;
    const closeDialog = (user: User | null) => {
      if (doUnmount) doUnmount();
      if (user) {
        if (user.status === UserStatus.Checking) {
          showAlert('当前账号状态审核中，请等待管理员审核');
        } else if (user.status === UserStatus.CheckFail || user.status === UserStatus.CheckIgnore) {
          showAlert(`当前账号状态审核失败${user.reject_reason ? `：${user.reject_reason}` : ''}`);
        } else if (user.status === UserStatus.Disabled) {
          showAlert(`当前账号已被禁用${user.reject_reason ? `：${user.reject_reason}` : ''}`);
        }
        setLoginUser(user);
      }
      resolve(user);
    };

    if (ApiUI.onCallLogin) {
      // 自定义登录流程
      let loginToken: string;
      try {
        const callLogin = ApiUI.onCallLogin;
        loginToken = await callLogin();
        if (!loginToken) {
          throw new Error('ApiUI.onCallLogin 返回 token 为空');
        }
        const loginUser = await userApi.getLoginUserByToken(loginToken);
        closeDialog({ ...loginUser, token: loginToken });
      } catch (e: any) {
        showErrorAlert(e?.message || String(e));
        closeDialog(null);
        return;
      }
      return;
    }

    const LoginPanel = () => {
      const [form] = Form.useForm();
      const [submitting, setSubmitting] = useState(false);
      const [showPassword, setShowPassword] = useState(false);
      const { data: captchaData, refresh: refreshCaptcha } = useRequest(() => loginApi.getLoginCaptcha());
      return (
        <Form
          form={form}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              e.stopPropagation();
              form.submit();
            }
          }}
          onFinish={async ({ username, password, captcha }) => {
            setSubmitting(true);
            try {
              const user = await loginApi.login({
                username,
                password,
                captcha_text: captcha,
                captcha_id: captchaData?.id || '',
              });
              showSnackbar('登录成功');
              closeDialog(user);
            } catch (e: any) {
              showAlert({ title: '登录失败', message: e?.message || String(e) });
              refreshCaptcha();
            }
            setSubmitting(false);
          }}
        >
          {() => (
            <>
              {bbsSetting.ui_tip_login?.trim() && (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2 }}>
                  <MarkdownPreview style={{ fontSize: 'inherit' }} markdown={bbsSetting.ui_tip_login} />
                </Box>
              )}
              <Field name="username" rules={[{ required: true, message: '请输入登录账号' }]} initialValue="">
                <TextField
                  margin="dense"
                  label={bbsSetting.site_enable_email === '1' ? '登录账号或邮箱' : '登录账号'}
                  placeholder="请输入"
                  fullWidth
                  variant="outlined"
                  name="username"
                  autoComplete="username"
                  error={!!form.getFieldError('username')?.length}
                  helperText={(form.getFieldError('username') || [])[0]}
                  sx={{ marginTop: 2 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AccountCircleIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Field>
              <Field name="password" rules={[{ required: true, message: '请输入密码' }]} initialValue="">
                <TextField
                  margin="dense"
                  label="密码"
                  placeholder="请输入"
                  fullWidth
                  variant="outlined"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  error={!!form.getFieldError('password')?.length}
                  helperText={(form.getFieldError('password') || [])[0]}
                  sx={{ marginTop: 2 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="start">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowPassword(!showPassword)}
                          onMouseDown={(e) => e.preventDefault()}
                          edge="end"
                        >
                          {showPassword ? <Visibility /> : <VisibilityOff />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Field>
              <Field name="captcha" rules={[{ required: true, message: '请输入验证码' }]} initialValue="">
                <TextField
                  margin="dense"
                  label="验证码"
                  placeholder="请输入"
                  fullWidth
                  variant="outlined"
                  name="captcha"
                  error={!!form.getFieldError('captcha')?.length}
                  helperText={(form.getFieldError('captcha') || [])[0]}
                  sx={{ marginTop: 2 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AssignmentTurnedInIcon />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        {captchaData?.svg && (
                          <img
                            alt="captcha"
                            src={`data:image/svg+xml;utf8,${encodeURIComponent(captchaData.svg)}`}
                            style={{
                              height: 40,
                              cursor: 'pointer',
                              transform: 'translate(8px, 0px)',
                              background: 'white',
                            }}
                            onClick={refreshCaptcha}
                          />
                        )}
                      </InputAdornment>
                    ),
                  }}
                />
              </Field>
              <LoadingButton
                loading={submitting}
                variant="contained"
                fullWidth
                sx={{ marginTop: 4 }}
                size="large"
                onClick={() => form.submit()}
              >
                登录
              </LoadingButton>
            </>
          )}
        </Form>
      );
    };

    const RegisterPanel = () => {
      if (bbsSetting.register_close === '1') {
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: 200, p: 2 }}>
            <Typography textAlign="center" pb={2}>
              已关闭新用户注册
            </Typography>
            {bbsSetting.register_close_reason?.trim() && (
              <MarkdownPreview style={{ fontSize: 'inherit' }} markdown={bbsSetting.register_close_reason} />
            )}
          </Box>
        );
      }
      if (bbsSetting.register_close === 'close_username') {
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2 }}>
            <Typography textAlign="center">
              {bbsSetting.site_enable_third_platform_login === '1' ? '请通过授权登录自动完成注册' : '论坛配置异常（未开启三方授权登录）'}
            </Typography>
          </Box>
        );
      }
      if (bbsSetting.site_close === '1') {
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: 200, p: 2 }}>
            <Typography textAlign="center" pb={2}>
              论坛已关闭
            </Typography>
            {bbsSetting.site_close_msg?.trim() && <MarkdownPreview style={{ fontSize: 'inherit' }} markdown={bbsSetting.site_close_msg} />}
          </Box>
        );
      }
      const [form] = Form.useForm();
      const [submitting, setSubmitting] = useState(false);
      const [showPassword, setShowPassword] = useState(false);
      const { data: captchaData, refresh: refreshCaptcha } = useRequest(() => loginApi.getRegisterCaptcha());
      return (
        <Form
          form={form}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              e.stopPropagation();
              form.submit();
            }
          }}
          onFinish={async ({ username, password, captcha }) => {
            setSubmitting(true);
            try {
              const user = await loginApi.register({
                username,
                password,
                captcha_text: captcha,
                captcha_id: captchaData?.id || '',
              });
              showSnackbar('注册成功');
              closeDialog(user);
            } catch (e: any) {
              showAlert({ title: '注册失败', message: e?.message || String(e) });
              refreshCaptcha();
            }
            setSubmitting(false);
          }}
        >
          {() => (
            <>
              {bbsSetting.ui_tip_register?.trim() && (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2 }}>
                  <MarkdownPreview style={{ fontSize: 'inherit' }} markdown={bbsSetting.ui_tip_register} />
                </Box>
              )}
              <Field name="username" rules={[{ required: true, message: '请输入登录账号' }]} initialValue="">
                <TextField
                  margin="dense"
                  label="登录账号"
                  placeholder="请输入"
                  fullWidth
                  variant="outlined"
                  name="username"
                  autoComplete="username"
                  error={!!form.getFieldError('username')?.length}
                  helperText={(form.getFieldError('username') || [])[0]}
                  sx={{ marginTop: 2 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AccountCircleIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Field>
              <Field name="password" rules={[{ required: true, message: '请输入密码' }]} initialValue="">
                <TextField
                  margin="dense"
                  label="密码"
                  placeholder="请输入"
                  fullWidth
                  variant="outlined"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  error={!!form.getFieldError('password')?.length}
                  helperText={(form.getFieldError('password') || [])[0]}
                  sx={{ marginTop: 2 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="start">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowPassword(!showPassword)}
                          onMouseDown={(e) => e.preventDefault()}
                          edge="end"
                        >
                          {showPassword ? <Visibility /> : <VisibilityOff />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Field>
              <Field
                name="repeat-password"
                rules={[
                  { required: true, message: '请重复输入密码' },
                  {
                    validator: async (rule: RuleObject, value: any) => {
                      if (value !== form.getFieldValue('password')) {
                        throw new Error('两次输入密码不一致');
                      }
                    },
                  },
                ]}
                initialValue=""
                validateTrigger={form.getFieldError('repeat-password')?.length ? 'onChange' : 'onBlur'}
              >
                <TextField
                  margin="dense"
                  label="重复密码"
                  placeholder="请重复输入密码"
                  fullWidth
                  variant="outlined"
                  name="repeat-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  error={!!form.getFieldError('repeat-password')?.length}
                  helperText={(form.getFieldError('repeat-password') || [])[0]}
                  sx={{ marginTop: 2 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="start">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowPassword(!showPassword)}
                          onMouseDown={(e) => e.preventDefault()}
                          edge="end"
                        >
                          {showPassword ? <Visibility /> : <VisibilityOff />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Field>
              <Field name="captcha" rules={[{ required: true, message: '请输入验证码' }]} initialValue="">
                <TextField
                  margin="dense"
                  label="验证码"
                  placeholder="请输入"
                  fullWidth
                  variant="outlined"
                  name="captcha"
                  error={!!form.getFieldError('captcha')?.length}
                  helperText={(form.getFieldError('captcha') || [])[0]}
                  sx={{ marginTop: 2 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AssignmentTurnedInIcon />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        {captchaData?.svg && (
                          <img
                            alt="captcha"
                            src={`data:image/svg+xml;utf8,${encodeURIComponent(captchaData.svg)}`}
                            style={{
                              height: 40,
                              cursor: 'pointer',
                              transform: 'translate(8px, 0px)',
                              background: 'white',
                            }}
                            onClick={refreshCaptcha}
                          />
                        )}
                      </InputAdornment>
                    ),
                  }}
                />
              </Field>
              <LoadingButton
                loading={submitting}
                variant="contained"
                fullWidth
                sx={{ marginTop: 4 }}
                size="large"
                onClick={() => form.submit()}
              >
                注册
              </LoadingButton>
            </>
          )}
        </Form>
      );
    };

    const ThirdLoginLine = () => {
      const onlyShowAlipay = isInAlipayMiniApp();
      const onlyShowWechat = isInWechatMiniApp();

      const qqLoginButton = (
        <IconButton
          title="QQ授权登录"
          onClick={() => {
            // 跳转到 QQ 完成登录
            const newWindowMessage = 'MBBS_QQ_LOGIN';
            const fallbackGoto = location.href; // 不支持新窗口打开的环境（手机微信等）用 fallback 地址识别登录结果，页面后会增加 LOGIN_TOKEN_FROM_QQ 参数，代表 QQ 登录 token
            window.open(
              `https://graph.qq.com/oauth2.0/authorize?response_type=token&client_id=102015788&redirect_uri=${encodeURIComponent(
                `http://mbbs.zdjl.site/qq_login_suc?message=${newWindowMessage}&fallbackGoto=${encodeURIComponent(fallbackGoto)}`,
              )}`,
            );
            window.addEventListener(
              'message',
              async (event) => {
                if (!/mbbs\.zdjl\.site/.test(event.origin)) return;
                if (String(event.data).indexOf(newWindowMessage) === 0) {
                  try {
                    const messageDataStr = String(event.data).substr(newWindowMessage.length).replace(/^\#/, '');
                    const access_token = QueryString.parse(messageDataStr).access_token;
                    const loginUser = await loginApi.loginByQQ({ qq_access_token: String(access_token) });
                    showSnackbar('授权登录成功');
                    closeDialog(loginUser);
                  } catch (e) {
                    showErrorAlert(e + '');
                  }
                }
              },
              false,
            );
          }}
        >
          <svg viewBox="0 0 1024 1024" width="24" height="24">
            <path
              d="M512 73.28A438.72 438.72 0 1 0 950.72 512 438.72 438.72 0 0 0 512 73.28zM759.84 646.4c-9.6 8.16-20.8-6.08-29.76-20.32s-14.88-26.72-16-21.76a158.4 158.4 0 0 1-37.44 70.72c-1.28 1.6 28.8 12.48 37.44 35.68s24 57.6-80 68.8a145.76 145.76 0 0 1-80-16c-16.96-8.32-27.52-16-29.6-16a73.6 73.6 0 0 1-13.28 0 108 108 0 0 1-14.4 0c-1.76 0-22.24 32-113.12 32-70.4 0-88.64-44.32-74.4-68.8s37.76-32 34.4-35.36a192 192 0 0 1-34.4-57.6 98.56 98.56 0 0 1-4.16-13.44c-1.28-4.64-6.56 8.64-13.92 21.76s-14.4 22.72-22.88 22.72a11.52 11.52 0 0 1-6.56-2.4c-20.96-16-19.2-55.2-5.44-93.12s48-75.04 48-83.2c1.28-30.24-3.04-35.2 0-43.2 6.56-17.76 14.72-10.88 14.72-20.16 0-116.32 86.4-210.56 192.96-210.56s192.96 94.24 192.96 210.56c0 4.48 11.68 0 17.12 20.16a196.96 196.96 0 0 1 0 43.2c0 11.04 29.44 24.48 44.8 83.2S768 640 759.84 646.4z"
              fill="#68A5E1"
            />
          </svg>
        </IconButton>
      );

      // 支付宝登录
      const alipayLoginButton = (
        <IconButton
          title="支付宝授权登录"
          onClick={async () => {
            const AlertContent = () => {
              const { data, error } = useRequest(() => loginApi.getAlipayLoginQRCode());
              const [qrCodeUrl, setQRCodeUrl] = useState('');

              useEffect(() => {
                if (data?.qrCodeUrl) {
                  // 露出登录页二维码
                  setQRCodeUrl(data.qrCodeUrl);

                  // 开始轮训 loginCode 是否成功
                  const intervalId = setInterval(async () => {
                    const user = await loginApi.checkLoginCode(data.loginCode);
                    if (user?.token) {
                      // 登录成功
                      unmountAlert();
                      clearInterval(intervalId);
                      showSnackbar('授权登录成功');
                      closeDialog(user);
                    }
                  }, 1000);

                  return () => clearInterval(intervalId);
                }
              }, [data?.qrCodeUrl, data?.loginCode]);

              if (error) {
                return <>登录出错：{error.message || String(error)}</>;
              }

              if (qrCodeUrl) {
                return (
                  <Box sx={{ textAlign: 'center' }}>
                    <img style={{ width: 260, height: 260 }} src={qrCodeUrl} />
                    <Typography mt={2}>支付宝扫码登录</Typography>
                  </Box>
                );
              }

              return <>正在登录...</>;
            };

            const unmountAlert = showAlert({
              title: '支付宝授权登录',
              message: <AlertContent />,
              okText: '取消',
            });
          }}
        >
          <svg viewBox="0 0 1024 1024" width="20" height="20">
            <path
              d="M230.4 576.512c-12.288 9.728-25.088 24.064-28.672 41.984-5.12 24.576-1.024 55.296 22.528 79.872 28.672 29.184 72.704 37.376 91.648 38.912 51.2 3.584 105.984-22.016 147.456-50.688 16.384-11.264 44.032-34.304 70.144-69.632-59.392-30.72-133.632-64.512-212.48-61.44-40.448 1.536-69.632 9.728-90.624 20.992zm752.64 135.68C1009.152 650.752 1024 583.168 1024 512 1024 229.888 794.112 0 512 0S0 229.888 0 512s229.888 512 512 512c170.496 0 321.536-83.968 414.72-211.968-88.064-43.52-232.96-115.712-322.56-159.232-42.496 48.64-105.472 97.28-176.64 118.272-44.544 13.312-84.992 18.432-126.976 9.728-41.984-8.704-72.704-28.16-90.624-47.616-9.216-10.24-19.456-22.528-27.136-37.888.512 1.024 1.024 2.048 1.024 3.072 0 0-4.608-7.68-7.68-19.456-1.536-6.144-3.072-11.776-3.584-17.92-.512-4.096-.512-8.704 0-12.8-.512-7.68 0-15.872 1.536-24.064 4.096-20.48 12.8-44.032 35.328-65.536 49.152-48.128 114.688-50.688 148.992-50.176 50.176.512 138.24 22.528 211.968 48.64 20.48-43.52 33.792-90.112 41.984-121.344h-307.2v-33.28h157.696v-66.56H272.384V302.08h190.464v-66.56c0-9.216 2.048-16.384 16.384-16.384h74.752v82.944h207.36v33.28h-207.36v66.56h165.888s-16.896 92.672-68.608 184.32c115.2 40.96 278.016 104.448 331.776 125.952z"
              fill="#5A9EF7"
            />
          </svg>
        </IconButton>
      );

      // 微信登录
      const weixinLoginButton = (
        <IconButton
          title="微信授权登录"
          onClick={async () => {
            const loginCode = `wx_login_${Date.now().toString(32)}_${Math.floor(Math.random() * 100000).toString(32)}`;

            const AlertContent = () => {
              const [qrCodeUrl, setQRCodeUrl] = useState('');

              useEffect(() => {
                // 露出登录页二维码
                setQRCodeUrl(`bbs/login/wxLoginQRCode.png?loginCode=${loginCode}`);

                // 开始轮训 loginCode 是否成功
                const intervalId = setInterval(async () => {
                  const user = await loginApi.checkLoginCode(loginCode);
                  if (user?.token) {
                    // 登录成功
                    unmountAlert();
                    clearInterval(intervalId);
                    showSnackbar('授权登录成功');
                    closeDialog(user);
                  }
                }, 1000);

                return () => clearInterval(intervalId);
              }, []);

              if (qrCodeUrl) {
                return (
                  <Box sx={{ textAlign: 'center' }}>
                    <img style={{ width: 260, height: 260 }} src={qrCodeUrl} />
                    <Typography mt={2}>微信扫码登录</Typography>
                  </Box>
                );
              }

              return <>正在登录...</>;
            };

            const unmountAlert = showAlert({
              title: '微信授权登录',
              message: <AlertContent />,
              okText: '取消',
            });
          }}
        >
          <svg viewBox="0 0 1024 1024" width="20" height="20">
            <path
              d="M319.302 385.396a33.513 33.513 0 1 0 67.025 0 33.513 33.513 0 1 0-67.025 0zM469.178 384.465a33.513 33.513 0 1 0 67.026 0 33.513 33.513 0 1 0-67.026 0zM552.9599999999999 534.342a23.273 23.273 0 1 0 46.545 0 23.273 23.273 0 1 0-46.545 0zM671.185 536.204a23.273 23.273 0 1 0 46.546 0 23.273 23.273 0 1 0-46.546 0z"
              fill="#50B674"
            />
            <path
              d="M512 0C229.004 0 0 229.004 0 512s229.004 512 512 512 512-229.004 512-512S794.996 0 512 0zm-87.505 630.225c-26.997 0-48.408-5.585-75.404-11.17l-75.404 37.236 21.411-64.233c-53.993-37.236-85.643-85.643-85.643-145.222 0-102.4 96.814-182.458 215.04-182.458 105.192 0 198.283 64.233 216.901 150.807-6.516-.93-13.963-.93-20.48-.93-102.4 0-182.458 76.334-182.458 170.356 0 15.825 2.793 30.72 6.517 44.684-7.448 0-13.964.93-20.48.93zm314.647 75.404l15.825 53.993-58.647-32.582c-21.41 5.585-42.822 11.17-64.233 11.17-102.4 0-182.458-69.817-182.458-155.46s80.058-155.463 182.458-155.463c96.815 0 182.458 69.818 182.458 155.462 0 47.476-31.65 90.298-75.403 122.88z"
              fill="#50B674"
            />
          </svg>
        </IconButton>
      );

      return (
        <>
          <Typography variant="body2" sx={{ opacity: 0.6 }}>
            授权登录
          </Typography>
          {onlyShowAlipay ? (
            alipayLoginButton
          ) : onlyShowWechat ? (
            weixinLoginButton
          ) : (
            <>
              {qqLoginButton}
              {weixinLoginButton}
              {alipayLoginButton}
            </>
          )}
        </>
      );
    };

    // 忘记密码（邮件重置密码）
    const showInputEmailToResetPasswordDialog = () => {
      showPromptDialog({
        title: '请输入账户绑定的邮箱',
        inputLabel: '邮箱地址',
        TextFieldProps: {
          autoComplete: 'email',
        },
        maxInputLength: 100,
        submitFailAlert: true,
        description: '确定后将发送 验证码 到该邮箱地址',
        onSubmit: async (email) => {
          await loginApi.sendResetPasswordEmailVerifyCode({ email });
          let verify_code: string;
          let new_password: string;
          showAlert({
            title: '重置密码',
            message: (
              <>
                <TextField
                  margin="dense"
                  label="邮箱验证码"
                  placeholder="请输入"
                  fullWidth
                  autoFocus
                  autoComplete="off"
                  variant="outlined"
                  sx={{ marginTop: 2 }}
                  onChange={(e) => (verify_code = e.target.value)}
                />
                <TextField
                  margin="dense"
                  label="新密码"
                  placeholder="请输入"
                  fullWidth
                  variant="outlined"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  sx={{ marginTop: 2 }}
                  onChange={(e) => (new_password = e.target.value)}
                />
              </>
            ),
            cancelText: '取消',
            okText: '确定',
            onOk: async () => {
              await loginApi.resetPasswordByBindEmail({ email, verify_code, new_password });
              showSnackbar('重置密码成功');
            },
          });
        },
      });
    };

    const Content = () => {
      const [currentIndex, setCurrentIndex] = useState(0);

      return (
        <>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', marginTop: -2, marginBottom: 2 }}>
            <Tabs value={currentIndex} onChange={(e, index) => setCurrentIndex(index)}>
              <Tab label="登录" sx={{ fontSize: 'larger' }} />
              <Tab label="注册" sx={{ fontSize: 'larger' }} />
            </Tabs>
          </Box>
          {currentIndex === 0 && <LoginPanel />}
          {currentIndex === 1 && <RegisterPanel />}
          <Box display="flex" alignItems="center" mt={1}>
            <Box display="flex" alignItems="center" flex={1}>
              {bbsSetting.site_enable_third_platform_login === '1' && <ThirdLoginLine />}
            </Box>
            {bbsSetting.site_enable_email === '1' && (
              <Button color="inherit" sx={{ opacity: 0.6, fontWeight: 'normal' }} onClick={showInputEmailToResetPasswordDialog}>
                忘记密码?
              </Button>
            )}
          </Box>
        </>
      );
    };

    doUnmount = showAlert({
      maxDialogWidth: 'xs',
      message: <Content />,
      okText: null,
      closeIcon: closeIcon,
      maskCancel: false,
      fullWidth: true,
      onOpenChange: (open) => {
        if (!open) {
          // 点击弹窗外阴影/关闭icon  关闭
          setTimeout(doUnmount, 500);
          resolve(null);
        }
      },
    });
  })
    .then((user) => {
      showLoginDialogPromise = null;
      return user;
    })
    .catch((e) => {
      showLoginDialogPromise = null;
      showSnackbar(e?.message || String(e));
      throw e;
    });
  return showLoginDialogPromise;
}
