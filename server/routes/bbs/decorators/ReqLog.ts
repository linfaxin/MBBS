import { createParamDecorator } from 'routing-controllers';
import { Options } from 'rotating-file-stream';
import { getUser, User } from '../../../models/User';
import { getDB, getDBNameFromApiRequest, hasDB } from '../../../models/db';
import { HEADER_TOKEN } from '../const';
import { getUserTokenByToken } from '../../../models/UserToken';
import { getLogger } from '../../../utils/log-util';
import { formatReqIP } from '../../../utils/format-utils';

const noopLogger: ReqLogger = {
  log() {
    // nothing
  },
};

export default function ReqLog(logFileName: `${string}.log`, logOptions?: Options) {
  return createParamDecorator({
    required: false,
    value: async (action) => {
      try {
        const token = action.request.headers[HEADER_TOKEN];
        const dbName = getDBNameFromApiRequest(action.request);
        if (!dbName) return noopLogger;
        if (!(await hasDB(dbName))) return noopLogger;
        const db = await getDB(dbName);
        let user: User;
        if (token) {
          const userId = (await getUserTokenByToken(db, token))?.user_id;
          if (userId) {
            user = await getUser(db, userId);
          }
        }
        return {
          log(content: object) {
            try {
              const logger = getLogger(logFileName, logOptions);
              logger.logWithDBAndUser(
                {
                  ...content,
                  _log_ip: formatReqIP(action.request.ip),
                },
                db,
                user,
              );
            } catch (e) {
              console.warn(e);
            }
          },
        } as ReqLogger;
      } catch (e) {
        console.warn(e);
        return noopLogger;
      }
    },
  });
}

export interface ReqLogger {
  log(content: object): void;
}
