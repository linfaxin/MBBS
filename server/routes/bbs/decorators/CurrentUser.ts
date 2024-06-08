import { createParamDecorator, NotFoundError, UnauthorizedError } from 'routing-controllers';
import { getUser } from '../../../models/User';
import { getDB, getDBNameFromApiRequest, hasDB } from '../../../models/db';
import { HEADER_TOKEN } from '../const';
import { getUserIdFromToken } from '../../../models/UserToken';
import { getSettingValue } from '../../../models/Settings';
import UIError from '../../../utils/ui-error';

export default function CurrentUser(options?: { required?: boolean; enableOnSiteClose?: boolean }) {
  return createParamDecorator({
    required: !!(options && options.required),
    value: async (action) => {
      const dbName = getDBNameFromApiRequest(action.request);
      if (!dbName) throw new NotFoundError('未找到绑定的论坛');
      if (!(await hasDB(dbName))) throw new NotFoundError('论坛不存在');
      const db = await getDB(dbName);

      const token = action.request.headers[HEADER_TOKEN];
      const userId = token ? await getUserIdFromToken(db, token) : null;
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
      }
      return user;
    },
  });
}
