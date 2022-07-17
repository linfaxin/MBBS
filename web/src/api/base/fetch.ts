import QueryString from 'query-string';
import { getLoginUser, setLoginUser } from '@/api/base/user';
import showLoginDialog from '@/utils/show-login-dialog';
import showSnackbar from '@/utils/show-snackbar';

/** 放于请求头，标识当前请求的来源用户id */
export const HEADER_USERID = 'mbbs-userid';

/** 放于请求头，携带当前用户身份 */
export const HEADER_TOKEN = 'authorization';

export default async function fetchApi(
  options:
    | string
    | {
        pathOrUrl: string;
        method: 'get' | 'post' | 'delete' | 'put' | 'patch';
        data?: object | FormData;
        headers?: Record<string, string>;
        showLoginIfUnAuth?: boolean;
      },
): Promise<{
  data?: any; // 返回内容
  extra?: { totalCount?: number } | any; // 额外信息
  success?: boolean; // 是否成功
  message?: string; // 错误描述文案
}> {
  const baseUrl = window.MBBS_BASE_URL;
  if (!baseUrl) throw new Error('fetch init error: miss window.BASE_URL');
  if (typeof options === 'string') {
    options = { pathOrUrl: options, method: 'get' };
  }
  const { pathOrUrl, method, data, headers = {}, showLoginIfUnAuth = true } = options;
  const loginUser = getLoginUser();

  let url = /^https?:\/\//.test(pathOrUrl) ? pathOrUrl : `${baseUrl.replace(/\/$/, '')}/${pathOrUrl.replace(/^\//, '')}`;
  if (data && /get/i.test(method)) {
    url = `${url}?${QueryString.stringify(data)}`;
  }
  if (!headers[HEADER_TOKEN] && loginUser?.token) {
    headers[HEADER_TOKEN] = loginUser.token;
  }
  if (loginUser?.id) {
    headers[HEADER_USERID] = String(loginUser.id);
  }
  if (/post|put|patch/i.test(method) && data) {
    if (data instanceof FormData) {
      // headers['content-type'] = 'multipart/form-data'; FormData 会自动设置
    } else {
      headers['content-type'] = 'application/json';
    }
  }
  let resp: Response;
  try {
    resp = await window.fetch(url, {
      method,
      body: /post|put|patch/i.test(method) && data ? (data instanceof FormData ? data : JSON.stringify(data)) : undefined,
      headers,
    });
  } catch (e: any) {
    throw new Error(`请求异常(${e?.message || String(e)})`);
  }
  let respJson;
  try {
    respJson = await resp.json();
  } catch (e) {
    if (resp.status >= 400) {
      throw new Error(`请求异常(${resp.status}): ${resp.statusText || '格式异常'}`);
    } else {
      throw new Error('返回格式异常');
    }
  }
  if (!respJson.success) {
    if (resp.status === 401) {
      if (showLoginIfUnAuth) {
        if (respJson.message) showSnackbar(respJson.message);
        const reLoginUser = await showLoginDialog();
        if (reLoginUser) {
          delete headers[HEADER_TOKEN];
          return fetchApi({ ...options, headers, showLoginIfUnAuth: false });
        }
      }
      setLoginUser(null);
      throw new Error(loginUser ? '登录过期，请重新登录' : '未登录，请先登录');
    }
    if (resp.status === 200 && respJson.message) {
      throw new Error(respJson.message);
    }
    throw new Error(`请求异常(${[respJson.name, resp.status].filter(Boolean).join('/')}): ${respJson.message || '系统出错'}`);
  }
  return respJson;
}
