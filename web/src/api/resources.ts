import fetchApi from '@/api/base/fetch';
import { getMyPermissions } from '@/api/permission';

export async function upload(data: Blob | File, fileName?: string | `attachment/${string}`): Promise<{ filePath: string }> {
  // 权限前置校验，避免文件传至服务器后才校验
  if (fileName?.startsWith('attachment/')) {
    if (!(await getMyPermissions()).includes('attachment.create.0')) {
      throw new Error('无附件上传权限');
    }
  } else {
    if (!(await getMyPermissions()).includes('attachment.create.1')) {
      throw new Error('无图片上传权限');
    }
  }

  const formData = new FormData();
  if (!fileName && data instanceof File) {
    fileName = data.name;
  }
  formData.append('fileName', fileName || 'noname');
  formData.append('file', data);

  return fetchApi({
    pathOrUrl: 'resources',
    method: 'post',
    data: formData,
  }).then((res) => res.data);
}

export async function del(fileKey: string): Promise<boolean> {
  return fetchApi({
    pathOrUrl: `resources/${fileKey}`,
    method: 'delete',
  }).then((res) => res.data);
}
