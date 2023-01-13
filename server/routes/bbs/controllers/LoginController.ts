import { BodyParam, Get, JsonController, Post, QueryParam, Req, Res } from 'routing-controllers';
import { v4 as uuidV4 } from 'uuid';
import { Duplex } from 'stream';
import { Sequelize } from 'sequelize';
import svgCaptcha = require('svg-captcha');
import LRUCache = require('lru-cache');
import fetch from 'node-fetch';
import CurrentDB from '../decorators/CurrentDB';
import { isDevEnv } from '../../../utils/env-util';
import { getUserByEmail, getUserByName, User } from '../../../models/User';
import { hashPassword, verifyPassword } from '../../../utils/password-util';
import { Request, Response } from 'express';
import { formatReqIP } from '../../../utils/format-utils';
import CurrentDomain from '../decorators/CurrentDomain';
import { saveUserToken } from '../../../models/UserToken';
import UIError from '../../../utils/ui-error';
import { getSettingValue } from '../../../models/Settings';
import ReqLog, { ReqLogger } from '../decorators/ReqLog';
import RegisterController from './RegisterController';
import { mailToEmail } from '../../../utils/mail-util';

let captchaIdNext = 1;
const captchaLruCache = new LRUCache<number, string>({
  max: 5000,
  maxAge: 1000 * 60 * 3, // 3 min
});

const ResetPasswordEmailVerifyCodeCacheMap = new LRUCache<String, { code: string; sendTime: number }>({
  max: 1000,
  maxAge: 1000 * 60 * 5, // 5 min
});

@JsonController('/login')
export default class LoginController {
  /**
   * 用户登录流程
   */
  static async doUserLogin(db: Sequelize, user: User, loginIp?: string) {
    if ((await getSettingValue(db, 'site_close')) === '1' && !(await user.isAdmin())) {
      throw new UIError('论坛已关闭');
    }

    user.last_login_ip = loginIp ? formatReqIP(loginIp) : '';
    user.login_at = new Date();
    await user.save();

    const loginToken = uuidV4();
    await saveUserToken(db, user.id, loginToken);

    return loginToken;
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
    @ReqLog('user_login.json.log') userLoginLogger: ReqLogger,
    @CurrentDB() db: Sequelize,
    @CurrentDomain() domain: string,
    @BodyParam('username', { required: true }) username: string,
    @BodyParam('password', { required: true }) password: string,
    @BodyParam('captcha_id', { required: true }) captchaId: number,
    @BodyParam('captcha_text', { required: true }) captchaText: string,
  ) {
    username = username.trim();
    captchaText = captchaText.trim();
    if (!isDevEnv() && captchaLruCache.get(captchaId)?.toUpperCase() !== captchaText.toUpperCase()) {
      throw new UIError('验证码校验失败，请重试');
    }
    captchaLruCache.del(captchaId);

    const user = (await getUserByName(db, username)) || (await getUserByEmail(db, username));
    if (!user) throw new UIError('用户不存在');
    if (!verifyPassword(password, user.password)) throw new UIError('密码错误');

    const loginToken = await LoginController.doUserLogin(db, user, request.ip);

    const userViewJSON = await user.toViewJSON();
    userLoginLogger.log(userViewJSON);
    return {
      ...userViewJSON,
      token: loginToken,
    };
  }

  @Post('/loginByQQ')
  async loginByQQ(
    @Req() request: Request,
    @ReqLog('user_login_by_qq.json.log') userLoginByQQLogger: ReqLogger,
    @ReqLog('user_login.json.log') userLoginLogger: ReqLogger,
    @CurrentDB() db: Sequelize,
    @CurrentDomain() domain: string,
    @BodyParam('qq_access_token', { required: true }) qq_access_token: string,
  ) {
    const qqUserInfo = await fetch(`https://graph.qq.com/oauth2.0/me?access_token=${qq_access_token}&unionid=1&fmt=json`).then((resp) =>
      resp.json(),
    );
    const { unionid, openid } = qqUserInfo;

    const username = `[QQ]${unionid}`;
    let user = await getUserByName(db, username);
    if (user) {
      // 已注册，进入登录流程
      const loginToken = await LoginController.doUserLogin(db, user, request.ip);

      const userViewJSON = await user.toViewJSON();
      userLoginLogger.log(userViewJSON);
      userLoginByQQLogger.log(userViewJSON);
      return {
        ...userViewJSON,
        token: loginToken,
      };
    } else {
      // 未注册
      await RegisterController.checkCanCreateUser(db);

      const userJSON = await RegisterController.doCreateUser({
        db,
        username,
        nickname: `QQ用户${unionid.substr(-6)}`,
        password: uuidV4(),
        requestIp: request.ip,
      });

      userLoginLogger.log({ ...userJSON, token: undefined });
      userLoginByQQLogger.log({ ...userJSON, token: undefined });
      return userJSON;
    }
  }

  @Get('/checkLoginCode')
  async checkLoginCode(
    @Req() request: Request,
    @CurrentDomain() domain: string,
    @CurrentDB() db: Sequelize,
    @ReqLog('user_login_by_code.json.log') userLoginByCodeLogger: ReqLogger,
    @ReqLog('user_login.json.log') userLoginLogger: ReqLogger,
    @QueryParam('loginCode') loginCode: string,
  ) {
    const resp = await fetch(`http://47.107.38.151:884/bbs/login/checkLoginCode?loginCode=${loginCode}&openApi=1`, {
      headers: { 'mbbs-domain': 'login-3rd-open-mbbs.mbbs.cc' },
    }).then((resp) => resp.json());
    const { username, nickname } = resp?.data || {};
    if (!username) return false;

    let user = await getUserByName(db, username);
    if (user) {
      // 已注册，进入登录流程
      const loginToken = await LoginController.doUserLogin(db, user, request.ip);

      const userViewJSON = await user.toViewJSON();
      userLoginLogger.log(userViewJSON);
      userLoginByCodeLogger.log(userViewJSON);
      return {
        ...userViewJSON,
        token: loginToken,
      };
    } else {
      // 未注册
      await RegisterController.checkCanCreateUser(db);

      const userJSON = await RegisterController.doCreateUser({
        db,
        username,
        nickname,
        password: uuidV4(),
        requestIp: request.ip,
      });

      userLoginLogger.log({ ...userJSON, token: undefined });
      userLoginByCodeLogger.log({ ...userJSON, token: undefined });
      return userJSON;
    }
  }

  @Get('/alipayLoginQRCode')
  async getAlipayLoginQRCode(@CurrentDomain() domain: string, @CurrentDB() db: Sequelize) {
    const resp = await fetch('http://47.107.38.151:884/bbs/login/alipayLoginQRCode', {
      headers: { 'mbbs-domain': 'login-3rd-open-mbbs.mbbs.cc' },
    }).then((resp) => resp.json());
    return {
      loginCode: resp?.data?.loginCode,
      qrCodeUrl: resp?.data?.qrCodeUrl,
    };
  }

  @Get('/wxLoginQRCode.png')
  async getWXLoginQRCode(
    @CurrentDomain() domain: string,
    @CurrentDB() db: Sequelize,
    @Res() res: Response,
    @QueryParam('loginCode') loginCode: string,
  ) {
    const arrayBuffer = await fetch(`http://47.107.38.151:884/bbs/login/wxLoginQRCode.png?loginCode=${loginCode}`, {
      headers: { 'mbbs-domain': 'login-3rd-open-mbbs.mbbs.cc' },
    }).then((resp) => resp.arrayBuffer());

    res.type('image/png');

    let stream = new Duplex();
    stream.push(Buffer.from(arrayBuffer));
    stream.push(null);
    return stream;
  }

  @Post('/sendResetPasswordEmailVerifyCode')
  async sendResetPasswordEmailVerifyCode(@CurrentDB() db: Sequelize, @BodyParam('email', { required: true }) email: string) {
    if (ResetPasswordEmailVerifyCodeCacheMap.get(email)?.sendTime > Date.now() - 1000 * 30) {
      // 30s 内仅发送一条验证码邮件
      throw new UIError('验证码发送太频繁，请稍后再试');
    }
    if (!(await getUserByEmail(db, email))) {
      throw new UIError('找不到该邮箱绑定的账号，请重新输入');
    }
    const verifyCode = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');

    await mailToEmail({
      db,
      mailKey: `verifyCode${verifyCode}`,
      email,
      title: '论坛重置密码邮箱验证',
      htmlBody: `您的验证码为 <b>${verifyCode}</b><br/><br/>验证码5分钟内有效，请尽快输入`,
    });

    ResetPasswordEmailVerifyCodeCacheMap.set(email, { code: verifyCode, sendTime: Date.now() });

    return true;
  }

  @Post('/resetPasswordByBindEmail')
  async resetPasswordByBindEmail(
    @CurrentDB() db: Sequelize,
    @BodyParam('verify_code', { required: true }) verify_code: string,
    @BodyParam('email', { required: true }) email: string,
    @BodyParam('new_password', { required: true }) newPassword: string,
  ) {
    if (newPassword.length < 6) throw new UIError('密码长度必须大于等于 6 位');
    if (ResetPasswordEmailVerifyCodeCacheMap.get(email)?.code !== verify_code) {
      throw new UIError('验证码校验失败');
    }
    // 验证码校验成功
    ResetPasswordEmailVerifyCodeCacheMap.del(email);

    const currentUser = await getUserByEmail(db, email);
    currentUser.password = hashPassword(newPassword);
    await currentUser.save();

    return true;
  }
}
