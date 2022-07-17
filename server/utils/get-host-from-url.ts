export default function getHostFromUrl(url: string) {
  if (!url) return '';
  return url
    .replace(/^.*?\/\//, '')
    .replace(/\/.*/, '')
    .replace(/\?.*/, '')
    .replace(/#.*/, '')
    .replace(/:.*/, '')
    .toLowerCase();
}
