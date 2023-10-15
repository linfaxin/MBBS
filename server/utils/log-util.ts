import { createStream, Options, RotatingFileStream } from 'rotating-file-stream';
import path = require('path');
import { debounce } from 'lodash';
import { User } from '../models/User';
import { Sequelize } from 'sequelize';
import { getDBNameFromDB, getDBPathFromDB } from '../models/db';

export const logPath = process.env.MBBS_LOG_DIR || 'logs';

export class Logger {
  private stream: RotatingFileStream;
  private pendingBufferContent = '';

  constructor(stream: RotatingFileStream) {
    this.stream = stream;
  }

  private flushPendingLogContent() {
    this.stream.write(this.pendingBufferContent);
    this.pendingBufferContent = '';
  }

  private debounceFlushPendingLogContent = debounce(
    () => {
      this.flushPendingLogContent();
    },
    1000,
    { maxWait: 5000 },
  );

  logWithDB(content: object, currentDB: Sequelize): void {
    content = {
      ...content,
      _log_db_path: getDBPathFromDB(currentDB),
    };
    this.log(content);
  }

  logWithDBAndUser(content: object, currentDB: Sequelize, currentUser?: User): void {
    content = {
      ...content,
      _log_db_name: getDBNameFromDB(currentDB),
      _log_db_path: getDBPathFromDB(currentDB),
      _log_user_id: currentUser?.id,
      _log_username: currentUser?.username,
    };
    this.log(content);
  }

  log(content: any): void {
    if (content == null) return;
    if (typeof content === 'object') {
      content = JSON.stringify({ ...content, _log_timestamp: Date.now() });
    }
    this.pendingBufferContent += `${content}\n`;
    this.debounceFlushPendingLogContent();
  }
}

const logPrinters = {} as Record<string, Logger>;

export function getLogger(logFileName: `${string}.log`, logOptions?: Options) {
  logFileName = path.join('/', logFileName).substr(1) as `${string}.log`;
  if (!logPrinters[logFileName]) {
    logPrinters[logFileName] = new Logger(
      createStream(logFileName, {
        interval: '1d', // 以天分隔日志文件
        size: '1M', // 单天日志文件最大 1M
        maxSize: '10M', // 所有日期下 该日志文件最大 10M
        maxFiles: 15, // 最多记录 15 天的数据
        path: logPath,
        ...logOptions,
      }),
    );
  }
  return logPrinters[logFileName];
}
