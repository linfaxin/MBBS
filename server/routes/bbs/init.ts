import 'reflect-metadata';
import { HttpError, useExpressServer } from 'routing-controllers';
import { Express } from 'express';
import * as path from 'path';

export function initBBSRouter(app: Express) {
  useExpressServer(app, {
    routePrefix: '/bbs',
    controllers: [path.join(`${__dirname}/controllers/*Controller.ts`), path.join(`${__dirname}/controllers/*Controller.js`)],
    interceptors: [`${__dirname}/global-interceptors/*.ts`, `${__dirname}/global-interceptors/*.js`],
    cors: true,
  });

  app.use('/bbs', (err, req, res, next) => {
    if (err instanceof HttpError && res.headersSent) {
      // HttpError 已经由 routing-controllers 内部错误处理器 处理，无需向上抛给 express（会导致错误）
      next();
    } else {
      next(err);
    }
  });
}
