export function formatReqIP(ip: string) {
  return ip?.match(/\d+\.\d+\.\d+\.\d+/)?.[0] || ip;
}

const sizeUnits = ['B', 'KB', 'MB', 'GB', 'TB'];

export function formatSize(length: number) {
  if (length < 0) return '?';
  for (let i = 0; i < sizeUnits.length; i++) {
    if (length < 1024) return formatNumber(length, 1) + sizeUnits[i];
    length = length / 1024;
  }
  return formatNumber(length, 1) + sizeUnits[sizeUnits.length - 1];
}

export function formatNumber(num: number, fixed = 1) {
  let str = num.toFixed(fixed);
  while (str.endsWith('0')) {
    str = str.substr(0, str.length - 1);
  }
  if (str.endsWith('.')) {
    str = str.substr(0, str.length - 1);
  }
  return str;
}

export function formatSubString(content: string, maxLength: number) {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength) + '...';
}
