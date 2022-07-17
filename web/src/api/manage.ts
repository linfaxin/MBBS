import fetchApi from '@/api/base/fetch';

/** 设置一个用户的密码 */
export function resetUserPassword(param: { user_id: number | string; new_password: string }) {
  return fetchApi({
    pathOrUrl: 'manage/resetUserPasswordByAdmin',
    method: 'post',
    data: param,
  }).then(() => {});
}

/** 获取 admin token */
export function getAdminApiToken(): Promise<string> {
  return fetchApi('manage/getAdminApiToken').then((resp) => resp.data);
}

/** 重置 admin token */
export function resetAdminApiToken(): Promise<string> {
  return fetchApi({
    pathOrUrl: 'manage/resetAdminApiToken',
    method: 'post',
  }).then((resp) => resp.data);
}

/** 获取绑定的自定义域名 */
export function getBindHosts(): Promise<{
  dbName: string;
  hosts: string;
}> {
  return fetchApi('manage/getBindHosts').then((resp) => resp.data);
}

/** 绑定自定义域名 */
export function setBindHosts(bind_hosts: string) {
  return fetchApi({
    pathOrUrl: 'manage/setBindHosts',
    method: 'post',
    data: { bind_hosts },
  }).then(() => {});
}

/** 获取当前 db 文件大小 */
export function getDBDataSize(): Promise<number> {
  return fetchApi('manage/getDBDataSize').then((resp) => resp.data);
}

/** 准备导出 db */
export function prepareExportDBData(): Promise<{ key: string }> {
  return fetchApi('manage/prepareExportDBData').then((resp) => resp.data);
}
