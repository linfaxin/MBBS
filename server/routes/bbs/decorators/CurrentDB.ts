import { createParamDecorator, NotFoundError } from 'routing-controllers';
import { getDB, getDBNameFromApiRequest, hasDB } from '../../../models/db';

export default function CurrentDB(options?: { required?: boolean }) {
  return createParamDecorator({
    required: !!(options && options.required),
    value: async (action) => {
      const dbName = getDBNameFromApiRequest(action.request);
      if (!dbName) throw new NotFoundError('未找到绑定的论坛');
      if (!(await hasDB(dbName))) throw new NotFoundError('论坛不存在');
      return getDB(dbName);
    },
  });
}
