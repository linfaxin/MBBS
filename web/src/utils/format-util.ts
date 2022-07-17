import dayjs from 'dayjs';

const sizeUnits = ['B', 'KB', 'MB', 'GB', 'TB'];

export function formatSize(length: number) {
  if (length == 0) return '0KB';
  if (!length) return '?';
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

export function formatHexColor(color: string) {
  if (!color) return color;
  if (/^#[\d|a-f|A-F]{6}$/.test(color)) {
    return color;
  }
  if (/^#[\d|a-f|A-F]{3}$/.test(color)) {
    return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
  }
  const rgbMatch = color.match(/^rgb\((.+),(.+),(.+)\)$/);
  if (rgbMatch) {
    let rStr = parseInt(rgbMatch[1]).toString(16);
    if (rStr.length === 1) rStr = `0${rStr}`;
    let gStr = parseInt(rgbMatch[2]).toString(16);
    if (gStr.length === 1) gStr = `0${gStr}`;
    let bStr = parseInt(rgbMatch[3]).toString(16);
    if (bStr.length === 1) bStr = `0${bStr}`;
    return `#${rStr}${gStr}${bStr}`;
  }
  const rgbaMatch = color.match(/^rgba\((.+),(.+),(.+),(.+)\)$/);
  if (rgbaMatch) {
    let rStr = parseInt(rgbaMatch[1]).toString(16);
    if (rStr.length === 1) rStr = `0${rStr}`;
    let gStr = parseInt(rgbaMatch[2]).toString(16);
    if (gStr.length === 1) gStr = `0${gStr}`;
    let bStr = parseInt(rgbaMatch[3]).toString(16);
    if (bStr.length === 1) bStr = `0${bStr}`;
    return `#${rStr}${gStr}${bStr}`;
  }
  return '';
}

export function formatRgbaColor(color: string) {
  if (!color) return color;
  if (/^#[\d|a-f|A-F]{3}$/.test(color)) {
    return `rgba(${parseInt(color[1] + color[1], 16)}, ${parseInt(color[2] + color[2], 16)}, ${parseInt(color[3] + color[3], 16)}, 1)`;
  }
  if (/^#[\d|a-f|A-F]{6}$/.test(color)) {
    return `rgba(${parseInt(color[1] + color[2], 16)}, ${parseInt(color[3] + color[4], 16)}, ${parseInt(color[5] + color[6], 16)}, 1)`;
  }
  if (/^#[\d|a-f|A-F]{8}$/.test(color)) {
    return `rgba(${parseInt(color[1] + color[2], 16)}, ${parseInt(color[3] + color[4], 16)}, ${parseInt(color[5] + color[6], 16)}, ${
      parseInt(color[7] + color[8], 16) / 255
    })`;
  }
  const rgbMatch = color.match(/^rgb\((.+),(.+),(.+)\)$/);
  if (rgbMatch) {
    return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, 1)`;
  }
  if (/^rgba\((.+),(.+),(.+),(.+)\)$/.test(color)) {
    return color;
  }
  return '';
}

export function formatTimeFriendly(date: Date | string | number) {
  const time = dayjs(date).toDate();
  const now = new Date();
  if (time.getFullYear() === now.getFullYear() && time.getMonth() === now.getMonth() && time.getDate() === now.getDate()) {
    return formatTime(time, 'HH:mm');
  }
  if (time.getFullYear() === now.getFullYear()) {
    return formatTime(time, 'MM-DD HH:mm');
  }
  return formatTime(date, 'YYYY-MM-DD HH:mm');
}

export function formatTime(data: Date | string | number, format = 'YYYY-MM-DD HH:mm:ss') {
  return dayjs(data).format(format);
}

export function formatTimeDurationFriendly(duration: number) {
  if (duration < 1000) return '<1 秒';
  if (duration < 60 * 1000) return `${Math.floor(duration / 1000)} 秒`;
  if (duration < 2 * 60 * 1000) return `1 分钟 ${Math.floor(duration / 1000 - 60)} 秒`.replace(/ 0 秒$/, '');
  if (duration < 3 * 60 * 1000) return `2 分钟 ${Math.floor(duration / 1000 - 120)} 秒`.replace(/ 0 秒$/, '');
  if (duration < 4 * 60 * 1000) return `3 分钟 ${Math.floor(duration / 1000 - 180)} 秒`.replace(/ 0 秒$/, '');
  if (duration < 5 * 60 * 1000) return `4 分钟 ${Math.floor(duration / 1000 - 240)} 秒`.replace(/ 0 秒$/, '');
  if (duration < 60 * 60 * 1000) return `${Math.floor(duration / 1000 / 60)} 分钟`.replace(/ 0 分钟$/, '');
  if (duration < 2 * 60 * 60 * 1000) return `1 小时 ${Math.floor(duration / 1000 / 60 - 60)} 分钟`.replace(/ 0 分钟$/, '');
  if (duration < 3 * 60 * 60 * 1000) return `2 小时 ${Math.floor(duration / 1000 / 60 - 120)} 分钟`.replace(/ 0 分钟$/, '');
  if (duration < 4 * 60 * 60 * 1000) return `3 小时 ${Math.floor(duration / 1000 / 60 - 180)} 分钟`.replace(/ 0 分钟$/, '');
  if (duration < 5 * 60 * 60 * 1000) return `4 小时 ${Math.floor(duration / 1000 / 60 - 240)} 分钟`.replace(/ 0 分钟$/, '');
  if (duration < 24 * 60 * 60 * 1000) return `${Math.floor(duration / 1000 / 60 / 60)} 小时`.replace(/ 0 小时$/, '');
  if (duration < 2 * 24 * 60 * 60 * 1000) return `1 天 ${Math.floor(duration / 1000 / 60 / 60 - 24)} 小时`.replace(/ 0 小时$/, '');
  if (duration < 3 * 24 * 60 * 60 * 1000) return `2 天 ${Math.floor(duration / 1000 / 60 / 60 - 48)} 小时`.replace(/ 0 小时$/, '');
  if (duration < 4 * 24 * 60 * 60 * 1000) return `3 天 ${Math.floor(duration / 1000 / 60 / 60 - 72)} 小时`.replace(/ 0 小时$/, '');
  if (duration < 5 * 24 * 60 * 60 * 1000) return `4 天 ${Math.floor(duration / 1000 / 60 / 60 - 96)} 小时`.replace(/ 0 小时$/, '');
  return `${Math.floor(duration / 1000 / 60 / 60 / 24)} 天`;
}
