export function getResourceUrl(resourceFilePath: string) {
  if (!resourceFilePath) {
    return resourceFilePath;
  }
  if (/^https?:\/\//.test(resourceFilePath)) {
    return resourceFilePath;
  }
  return `${(window.MBBS_RESOURCE_BASE_URL || '').replace(/\/$/, '')}/${resourceFilePath.replace(/^\//, '')}`;
}
