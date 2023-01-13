import { createParamDecorator, NotFoundError, UnauthorizedError } from 'routing-controllers';
import { getUser } from '../../../models/User';
import { getDB, getDBNameFromApiRequest, hasDB } from '../../../models/db';
import { HEADER_TOKEN } from '../const';
import { getUserIdFromToken } from '../../../models/UserToken';
import { getSettingValue } from '../../../models/Settings';
import UIError from '../../../utils/ui-error';

export default function CurrentUser(options?: { required?: boolean }) {
  return createParamDecorator({
    required: !!(options && options.required),
    value: async (action) => {
      const token = action.request.headers[HEADER_TOKEN];
      if (!token) {
        if (options?.required) throw new UnauthorizedError();
        return null;
      }
      const dbName = getDBNameFromApiRequest(action.request);
      if (!dbName) throw new NotFoundError('未找到绑定的论坛');
      if (!(await hasDB(dbName))) throw new NotFoundError('论坛不存在');
      const db = await getDB(dbName);
      const userId = await getUserIdFromToken(db, token);
      if (!userId) {
        if (options?.required) throw new UnauthorizedError();
        return null;
      }
      const user = await getUser(db, userId);
      if (!user) {
        if (options?.required) throw new UnauthorizedError();
        return null;
      }
      if ((await getSettingValue(db, 'site_close')) === '1' && !(await user.isAdmin())) {
        throw new UIError('论坛已关闭');
      }
      return user;
    },
  });
}
