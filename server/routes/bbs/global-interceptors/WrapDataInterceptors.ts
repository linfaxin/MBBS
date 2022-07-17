import { Interceptor, InterceptorInterface, Action } from 'routing-controllers';
import { Stream } from 'stream';
import { Response } from 'express-serve-static-core';

export const WrapDataExtraKey = Symbol('WrapDataExtraKey');

@Interceptor()
export class WrapDataInterceptors implements InterceptorInterface {
  intercept(action: Action, content: any) {
    if (!(action.response as Response).getHeader('Cache-Control')) {
      (action.response as Response).setHeader('Vary', '*'); // 告知 浏览器/中间服务器 不缓存
    }
    if (content instanceof Stream) {
      return content;
    }
    if (content instanceof Error) {
      return { success: false, message: content.message, name: content.name };
    }
    return { data: content, success: true, extra: content?.[WrapDataExtraKey] };
  }
}
