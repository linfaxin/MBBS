import { createParamDecorator, NotFoundError, UnauthorizedError } from 'routing-controllers';
import { getUser } from '../../../models/User';
import { getDB, getDBNameFromApiRequest, hasDB } from '../../../models/db';
import { HEADER_TOKEN } from '../const';
import { loginByUserToken } from '../../../models/UserToken';
import { getSettingValue } from '../../../models/Settings';
import UIError from '../../../utils/ui-error';
import { formatReqIP } from '../../../utils/format-utils';

export default function CurrentUser(options?: { required?: boolean; enableOnSiteClose?: boolean }) {
  return createParamDecorator({
    required: !!(options && options.required),
    value: async (action) => {
      const dbName = getDBNameFromApiRequest(action.request);
      if (!dbName) throw new NotFoundError('未找到绑定的论坛');
      if (!(await hasDB(dbName))) throw new NotFoundError('论坛不存在');
      const db = await getDB(dbName);

      const token = action.request.headers[HEADER_TOKEN];
      const loginTokenResult = token ? await loginByUserToken(db, token) : null;
      const userId = loginTokenResult?.userId;
      const user = userId ? await getUser(db, userId) : null;
      if (!user) {
        // 未登录
        if (options?.required) throw new UnauthorizedError();
        if (!options?.enableOnSiteClose && (await getSettingValue(db, 'site_close')) === '1') {
          throw new UIError('论坛已关闭');
        }
      } else {
        // 已登录
        if (!options?.enableOnSiteClose && (await getSettingValue(db, 'site_close')) === '1' && !(await user.isAdmin())) {
          throw new UIError('论坛已关闭');
        }
        if (loginTokenResult.newLogin) {
          // 更新登录时间
          user.last_login_ip = formatReqIP(action.request.ip);
          user.login_at = new Date();
          await user.save();
        }
      }
      return user;
    },
  });
}
