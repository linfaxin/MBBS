import { BodyParam, Get, JsonController, Post, Req } from 'routing-controllers';
import { v4 as uuidV4 } from 'uuid';
import { Sequelize } from 'sequelize';
import { Request } from 'express';
import svgCaptcha = require('svg-captcha');
import LRUCache = require('lru-cache');
import { noop } from 'lodash';
import CurrentDB from '../decorators/CurrentDB';
import { isDevEnv } from '../../../utils/env-util';
import { getUserByName, getUserModel, UserStatus } from '../../../models/User';
import { hashPassword } from '../../../utils/password-util';
import { formatReqIP } from '../../../utils/format-utils';
import CurrentDomain from '../decorators/CurrentDomain';
import { getDefaultGroup } from '../../../models/Group';
import { saveUserToken } from '../../../models/UserToken';
import { getSettingValue } from '../../../models/Settings';
import UIError from '../../../utils/ui-error';
import ReqLog, { ReqLogger } from '../decorators/ReqLog';
import { insertUserMessage } from '../../../models/UserMessage';

let captchaIdNext = 1;
const captchaLruCache = new LRUCache<number, string>({
  max: 5000,
  maxAge: 1000 * 60 * 3, // 3 min
});

@JsonController('/register')
export default class RegisterController {
  static async checkCanCreateUser(db: Sequelize, createdBy: 'username' | '3rd') {
    const register_close = await getSettingValue(db, 'register_close');
    if ('1' === register_close) {
      throw new UIError('已关闭新用户注册');
    }
    if (createdBy === 'username' && register_close === 'close_username') {
      throw new UIError('已关闭用户名方式注册');
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
      insertUserMessage(db, {
        title: '有新注册的用户需要审核',
        content: '点击"查看详情"跳转至审核页',
        link: '/#/manage/user?status=2',
        user_id: (await getUserByName(db, 'admin')).id,
        from_user_id: user.id,
        unread_merge_key: 'manageUser',
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
    await RegisterController.checkCanCreateUser(db, 'username');

    if (password.length < 6) throw new UIError('密码长度必须大于等于 6 位');
    username = username.trim();
    if (username.length < 3) throw new UIError('用户名长度必须大于等于 3 位');
    if (!/^[\d|a-z|A-Z|\-|_]*$/.test(username)) throw new UIError('用户名只能由数字、英文字母组成');
    if (username === '管理员' || username === '系统管理员') throw new UIError('禁止使用该用户名');

    captchaText = captchaText.trim();
    if (!isDevEnv() && captchaLruCache.get(captchaId)?.toUpperCase() !== captchaText.toUpperCase()) {
      throw new UIError('验证码校验失败，请重试');
    }
    if (await getUserByName(db, username)) {
      throw new UIError('该账号已存在');
    }
    captchaLruCache.del(captchaId);

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
