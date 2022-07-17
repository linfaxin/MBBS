import fetchApi from '@/api/base/fetch';
import { formatUserField, User } from './base/user';

export async function getLoginCaptcha() {
  const resp = await fetchApi('/login/captcha');
  return resp.data as { id: string; svg: string };
}

export async function login(param: { username: string; password: string; captcha_id: string; captcha_text: string }) {
  const resp = await fetchApi({
    pathOrUrl: '/login',
    method: 'post',
    data: param,
  });
  const user = resp.data as User;
  formatUserField(user);
  return user;
}

export async function loginByQQ(param: { qq_access_token: string }) {
  const resp = await fetchApi({
    pathOrUrl: '/login/loginByQQ',
    method: 'post',
    data: param,
  });
  const user = resp.data as User;
  formatUserField(user);
  return user;
}

export async function getRegisterCaptcha() {
  const resp = await fetchApi('/register/captcha');
  return resp.data as { id: string; svg: string };
}

export async function register(param: { username: string; password: string; captcha_id: string; captcha_text: string }) {
  const resp = await fetchApi({
    pathOrUrl: '/register',
    method: 'post',
    data: param,
  });
  const user = resp.data as User;
  formatUserField(user);
  return user;
}

export async function getAlipayLoginQRCode() {
  const resp = await fetchApi('/login/alipayLoginQRCode');
  return resp.data as { qrCodeUrl: string; loginCode: string };
}

export async function checkLoginCode(loginCode: string) {
  const resp = await fetchApi(`/login/checkLoginCode?loginCode=${loginCode}`);
  if (!resp.data) return null;
  const user = resp.data as User;
  formatUserField(user);
  return user;
}

export function sendResetPasswordEmailVerifyCode(param: { email: string }) {
  return fetchApi({
    pathOrUrl: '/login/sendResetPasswordEmailVerifyCode',
    method: 'post',
    data: param,
  });
}

export function resetPasswordByBindEmail(param: { email: string; verify_code: string; new_password: string }) {
  return fetchApi({
    pathOrUrl: '/login/resetPasswordByBindEmail',
    method: 'post',
    data: param,
  });
}
