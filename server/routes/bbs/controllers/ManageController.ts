import { Body, BodyParam, Get, JsonController, Post, QueryParam, Req, Res } from 'routing-controllers';
import { Op, Sequelize } from 'sequelize';
import { v4 as uuidV4 } from 'uuid';
import CurrentDB from '../decorators/CurrentDB';
import { getUser, getUserByName, getUserModel, User, UserStatus } from '../../../models/User';
import CurrentUser from '../decorators/CurrentUser';
import UIError from '../../../utils/ui-error';
import { hashPassword } from '../../../utils/password-util';
import { Request, Response } from 'express';
import { getDefaultGroup } from '../../../models/Group';
import { formatReqIP } from '../../../utils/format-utils';
import { getUserTokenModel, getValidUserTokens, saveUserToken } from '../../../models/UserToken';
import { getBindHosts, setBindHosts } from '../../../utils/bind-host-util';
import CurrentDBName from '../decorators/CurrentDomain';
import getHostFromUrl from '../../../utils/get-host-from-url';
import { getDBFilePath } from '../../../models/db';
import { TOKEN_DEFAULT_VALID_DAY_COUNT } from '../const';

import fse = require('fs-extra');
import path = require('path');
import LRUCache = require('lru-cache');

@JsonController('/manage')
export default class ManageController {
  @Get('/getAdminApiToken')
  async getAdminApiToken(@CurrentDB() db: Sequelize, @CurrentUser({ required: true }) currentUser: User) {
    if (!(await currentUser.isAdmin())) {
      throw new UIError('无权调用');
    }
    const adminTokens = await getValidUserTokens(db, currentUser.id);
    return adminTokens.find((t) => t.expired_at == null)?.token;
  }

  @Post('/resetAdminApiToken')
  async resetAdminApiToken(@CurrentDB() db: Sequelize, @CurrentUser({ required: true }) currentUser: User) {
    if (!(await currentUser.isAdmin())) {
      throw new UIError('无权调用');
    }

    const UserTokenModel = await getUserTokenModel(db);
    await UserTokenModel.destroy({
      where: {
        user_id: currentUser.id,
        expired_at: {
          [Op.is]: null,
        },
      },
    });

    const loginToken = uuidV4();
    await saveUserToken(db, currentUser.id, loginToken, null);

    return loginToken;
  }

  @Post('/resetUserPasswordByAdmin')
  async resetUserPasswordByAdmin(
    @CurrentDB() db: Sequelize,
    @CurrentUser({ required: true }) currentUser: User,
    @BodyParam('user_id', { required: true }) userId: number,
    @BodyParam('new_password', { required: true }) newPassword: string,
  ) {
    if (!(await currentUser.isAdmin())) {
      throw new UIError('无权调用');
    }
    const aimUser = await getUser(db, userId);
    if (await aimUser.isAdmin()) {
      throw new UIError('无法重置管理员密码');
    }
    aimUser.password = hashPassword(newPassword);
    await aimUser.save();
    return true;
  }

  @Post('/createUserByAdmin')
  async createUserByAdmin(
    @Req() request: Request,
    @CurrentDB() db: Sequelize,
    @CurrentUser({ required: true }) currentUser: User,
    @BodyParam('username', { required: true }) username: string,
    @BodyParam('password', { required: true }) password: string,
    @BodyParam('nickname') nickname: string,
    @BodyParam('email') email: string,
  ) {
    if (!(await currentUser.isAdmin())) {
      throw new UIError('无权调用');
    }
    if (await getUserByName(db, username)) {
      throw new UIError('该账号已注册');
    }

    const defaultGroup = await getDefaultGroup(db);
    if (!defaultGroup) {
      throw new UIError('论坛配置异常：缺少默认角色分组');
    }

    const UserModel = await getUserModel(db);

    // 校验通过，开始创建用户
    const user = await UserModel.create({
      username,
      nickname,
      email,
      password: hashPassword(password),
      register_ip: formatReqIP(request.ip),
      status: UserStatus.Normal,
    });

    // 设置用户分组
    if (defaultGroup) {
      await user.setGroupId(defaultGroup.id);
    }

    const loginToken = uuidV4();
    await saveUserToken(db, user.id, loginToken);

    return {
      ...(await user.toViewJSON()),
      token: loginToken,
    };
  }

  @Post('/createUserTokenByAdmin')
  async createUserTokenByAdmin(
    @Req() request: Request,
    @CurrentDB() db: Sequelize,
    @CurrentUser({ required: true }) currentUser: User,
    @BodyParam('user_id') user_id: number,
    @BodyParam('username') username: string,
    @BodyParam('valid_days') valid_days: number = TOKEN_DEFAULT_VALID_DAY_COUNT,
  ) {
    if (!(await currentUser.isAdmin())) {
      throw new UIError('无权调用');
    }
    if (!user_id && !username) {
      throw new UIError('缺少指定的用户参数');
    }
    const user = (await getUser(db, user_id)) || (await getUserByName(db, username));
    if (!user) {
      throw new UIError('用户未找到');
    }
    if (await user.isAdmin()) {
      throw new UIError('不能用该接口创建 admin 的 token');
    }
    const loginToken = uuidV4();
    await saveUserToken(db, user.id, loginToken, new Date(Date.now() + valid_days * 24 * 60 * 60 * 1000));

    return {
      ...(await user.toViewJSON()),
      token: loginToken,
    };
  }

  @Get('/getBindHosts')
  async getBindHosts(@Req() request: Request, @CurrentDBName() dbName: string) {
    return {
      dbName,
      hosts: (await getBindHosts(dbName)).join('\n'),
    };
  }

  @Post('/setBindHosts')
  async setBindHosts(
    @Req() request: Request,
    @CurrentDBName() dbName: string,
    @CurrentDB() db: Sequelize,
    @CurrentUser({ required: true }) currentUser: User,
    @BodyParam('bind_hosts') bindHostStr: string,
  ) {
    if (!(await currentUser.isAdmin())) {
      throw new UIError('无权调用');
    }
    const bindHosts = (bindHostStr || '')
      .split(/[\n,]/)
      .filter(Boolean)
      .map((line) => getHostFromUrl(line.trim()));
    await setBindHosts(dbName, bindHosts);
  }

  @Get('/getDBDataSize')
  async getDBDataSize(
    @Res() res: Response,
    @Req() request: Request,
    @CurrentDBName() dbName: string,
    @CurrentDB() db: Sequelize,
    @CurrentUser({ required: true }) currentUser: User,
  ) {
    if (!(await currentUser.isAdmin())) {
      throw new UIError('无权调用');
    }

    const dbFilePath = getDBFilePath(dbName);
    return fse.statSync(dbFilePath).size;
  }

  preparingExportDBData = new LRUCache<string, string>({ maxAge: 5 * 60 * 1000 }); // key, dbFilePath
  @Get('/prepareExportDBData')
  async prepareExportDBData(
    @Res() res: Response,
    @Req() request: Request,
    @CurrentDBName() dbName: string,
    @CurrentDB() db: Sequelize,
    @CurrentUser({ required: true }) currentUser: User,
  ) {
    if (!(await currentUser.isAdmin())) {
      throw new UIError('无权调用');
    }

    const preparedKey = uuidV4();
    const dbFilePath = getDBFilePath(dbName);
    if (!dbFilePath) {
      throw new UIError('文件不存在');
    }
    this.preparingExportDBData.set(preparedKey, dbFilePath);
    return { key: preparedKey };
  }

  @Get('/downloadPreparedDBData')
  async downloadPreparedDBData(@Res() res: Response, @Req() request: Request, @QueryParam('key', { required: true }) key: string) {
    const dbFilePath = this.preparingExportDBData.get(key);
    if (!dbFilePath) {
      throw new UIError('文件不存在');
    }
    res.type('application/octet-stream');
    res.attachment(path.basename(dbFilePath));
    return fse.createReadStream(dbFilePath);
  }
}
