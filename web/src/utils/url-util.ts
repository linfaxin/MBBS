const aConvert = document.createElement('a');

export function toAbsUrl(url: string) {
  aConvert.href = url;
  return aConvert.href;
}

export function appendHttpPrefixForInputUrl(url: string) {
  if (!url) return url;
  if (!/^https?:/.test(url) && url.split('/')[0].includes('.')) {
    return `http://${url}`;
  }
  return url;
}
