import { BodyParam, Get, JsonController, Post, Req } from 'routing-controllers';
import { v4 as uuidV4 } from 'uuid';
import { Sequelize } from 'sequelize';
import CurrentDB from '../decorators/CurrentDB';
import { isDevEnv } from '../../../utils/env-util';
import { getUserByName, getUserModel, UserStatus } from '../../../models/User';
import { hashPassword } from '../../../utils/password-util';
import { Request } from 'express';
import { formatReqIP } from '../../../utils/format-utils';
import CurrentDomain from '../decorators/CurrentDomain';
import { getDefaultGroup } from '../../../models/Group';
import { saveUserToken } from '../../../models/UserToken';
import { getSettingValue } from '../../../models/Settings';
import svgCaptcha = require('svg-captcha');
import LRUCache = require('lru-cache');
import UIError from '../../../utils/ui-error';
import ReqLog, { ReqLogger } from '../decorators/ReqLog';
import { mailToUser } from '../../../utils/mail-util';
import { getDefaultHost } from '../../../utils/bind-host-util';
import { noop } from 'lodash';
import { getDBNameFromDB } from '../../../models/db';

let captchaIdNext = 1;
const captchaLruCache = new LRUCache<number, string>({
  max: 5000,
  maxAge: 1000 * 60 * 3, // 3 min
});

@JsonController('/register')
export default class RegisterController {
  static async checkCanCreateUser(db: Sequelize) {
    if ('1' === (await getSettingValue(db, 'register_close'))) {
      throw new UIError('已关闭新用户注册');
    }
    if ((await getSettingValue(db, 'site_close')) === '1') {
      throw new UIError('论坛已关闭');
    }
    // 校验通过，开始创建用户
  }

  static async doCreateUser(options: {
    db: Sequelize;
    username: string;
    nickname?: string;
    password: string;
    requestIp?: string;
    needValidate?: boolean;
  }) {
    const { db, username, nickname = username, password, requestIp } = options;

    const defaultGroup = await getDefaultGroup(db);
    if (!defaultGroup) {
      throw new UIError('论坛配置异常：缺少默认角色分组');
    }
    let needValidate = options.needValidate;
    if (needValidate == null) {
      needValidate = (await getSettingValue(db, 'register_validate')) === '1';
    }

    const UserModel = await getUserModel(db);
    const user = await UserModel.create({
      username,
      nickname,
      password: hashPassword(password),
      register_ip: formatReqIP(requestIp),
      last_login_ip: formatReqIP(requestIp),
      status: needValidate ? UserStatus.Checking : UserStatus.Normal,
    });

    if (needValidate && (await getSettingValue(db, '__internal_reviewed_content_notice_admin_email')) === '1') {
      mailToUser({
        db,
        mailKey: 'manageUser',
        userName: 'admin',
        title: '有新注册的用户需要审核',
        htmlBody: `有新用户 "${nickname}" 申请注册，<br/>请至 <a href="http://${await getDefaultHost(
          getDBNameFromDB(db),
        )}/#/manage/user?status=2">论坛管理后台</a> 查看审核`,
      }).catch(noop);
    }

    // 设置用户分组
    if (defaultGroup) {
      await user.setGroupId(defaultGroup.id);
    }

    // 设置用户登录 token
    const loginToken = uuidV4();
    await saveUserToken(db, user.id, loginToken);

    const userViewJSON = await user.toViewJSON();

    return {
      ...userViewJSON,
      token: loginToken,
    };
  }

  @Get('/captcha')
  getCaptcha() {
    const captcha = svgCaptcha.create({ ignoreChars: 'IloO0' });
    const captchaId = captchaIdNext++;
    captchaLruCache.set(captchaId, captcha.text);
    return { id: captchaId, svg: captcha.data };
  }

  @Post('/')
  async post(
    @Req() request: Request,
    @ReqLog('user_register.json.log') userRegisterLogger: ReqLogger,
    @CurrentDB() db: Sequelize,
    @CurrentDomain() domain: string,
    @BodyParam('username', { required: true }) username: string,
    @BodyParam('password', { required: true }) password: string,
    @BodyParam('captcha_id', { required: true }) captchaId: number,
    @BodyParam('captcha_text', { required: true }) captchaText: string,
  ) {
    await RegisterController.checkCanCreateUser(db);

    if (password.length < 6) throw new UIError('密码长度必须大于等于 6 位');
    username = username.trim();
    if (username.length < 3) throw new UIError('用户名长度必须大于等于 3 位');
    if (!/^[\d|a-z|A-Z|\-|_]*$/.test(username)) throw new UIError('用户名只能由数字、英文字母组成');

    captchaText = captchaText.trim();
    if (!isDevEnv() && captchaLruCache.get(captchaId)?.toUpperCase() !== captchaText.toUpperCase()) {
      throw new UIError('验证码校验失败，请重试');
    }
    captchaLruCache.del(captchaId);
    if (await getUserByName(db, username)) {
      throw new UIError('该账号已存在');
    }

    const userJSON = await RegisterController.doCreateUser({
      db,
      username,
      password,
      requestIp: request.ip,
    });

    userRegisterLogger.log({ ...userJSON, token: undefined });
    return userJSON;
  }
}
