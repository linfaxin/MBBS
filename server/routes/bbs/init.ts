import 'reflect-metadata';
import { useExpressServer } from 'routing-controllers';
import { Express } from 'express';
import * as path from 'path';

export function initBBSRouter(app: Express) {
  useExpressServer(app, {
    routePrefix: '/bbs',
    controllers: [path.join(`${__dirname}/controllers/*Controller.ts`), path.join(`${__dirname}/controllers/*Controller.js`)],
    interceptors: [`${__dirname}/global-interceptors/*.ts`, `${__dirname}/global-interceptors/*.js`],
    cors: true,
  });
}
