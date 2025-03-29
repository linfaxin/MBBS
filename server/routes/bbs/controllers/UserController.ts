import { BadRequestError, Body, BodyParam, Get, JsonController, Param, Post, QueryParam } from 'routing-controllers';
import CurrentDB from '../decorators/CurrentDB';
import { getUser, getUserByEmail, getUserByName, getUserByNickName, getUserModel, User, UserStatus } from '../../../models/User';
import { Op, Sequelize, WhereOptions } from 'sequelize';
import CurrentUser from '../decorators/CurrentUser';
import { getGroupById } from '../../../models/Group';
import { hashPassword, verifyPassword } from '../../../utils/password-util';
import UIError from '../../../utils/ui-error';
import { getGroupUserIds } from '../../../models/GroupUser';
import { WrapDataExtraKey } from '../global-interceptors/WrapDataInterceptors';
import { hasPermission } from '../../../models/GroupPermission';
import { GROUP_ID_ADMIN, GROUP_ID_TOURIST } from '../const';
import ReqLog, { ReqLogger } from '../decorators/ReqLog';
import * as LRUCache from 'lru-cache';
import { mailToEmail } from '../../../utils/mail-util';
import { getSettingValue } from '../../../models/Settings';

class ModifyUserRequest {
  nickname?: string;
  avatar?: string;
  signature?: string;
  status?: UserStatus;
  reject_reason?: string;
  group_id?: number;
}

const BindEmailVerifyCodeCacheMap = new LRUCache<String, { code: string; sendTime: number }>({
  max: 1000,
  maxAge: 1000 * 60 * 5, // 5 min
});

const UnBindEmailVerifyCodeCacheMap = new LRUCache<String, { code: string; sendTime: number }>({
  max: 1000,
  maxAge: 1000 * 60 * 5, // 5 min
});

@JsonController('/users')
export default class UserController {
  @Get('/getLoginUser')
  async getLoginUser(@CurrentUser({ required: true }) currentUser: User) {
    return currentUser.toViewJSON({ showRealEmail: true });
  }

  @Get('/getByName')
  async getByName(@CurrentUser() currentUser: User, @CurrentDB() db: Sequelize, @QueryParam('name') name: string) {
    const user = await getUserByName(db, name);
    if (user == null) throw new UIError('用户未找到');
    const hasViewUserPermission = currentUser
      ? currentUser.username === name || (await currentUser.hasPermission('user.view'))
      : await hasPermission(db, GROUP_ID_TOURIST, 'user.view');
    if (!hasViewUserPermission) {
      throw new UIError('无权查看用户信息');
    }
    return user.toViewJSON();
  }

  @Post('/setUserGroup')
  async setUserGroup(
    @ReqLog('user_group_change.json.log') userGroupChangeLogger: ReqLogger,
    @CurrentUser({ required: true }) currentUser: User,
    @CurrentDB() db: Sequelize,
    @BodyParam('user_id', { required: true }) userId: number,
    @BodyParam('group_id', { required: true }) groupId: number,
  ) {
    if (groupId === GROUP_ID_ADMIN || groupId === GROUP_ID_TOURIST) {
      throw new UIError('不支持设置为该用户角色');
    }
    if (!(await currentUser.hasPermission('user.edit.group'))) {
      throw new UIError('无权修改');
    }
    const aimUser = await getUser(db, userId);
    if (await aimUser.isAdmin()) {
      throw new UIError('无权修改');
    }
    const beforeGroupId = await aimUser.getGroupId();
    await aimUser.setGroupId(groupId);
    userGroupChangeLogger.log({ userId: aimUser.id, beforeGroupId, newGroupId: groupId });
  }

  @Get('/getUserGroup')
  async getUserGroup(@CurrentDB() db: Sequelize, @QueryParam('user_id', { required: true }) userId: number) {
    const aimUser = await getUser(db, userId);
    const groupId = await aimUser.getGroupId();
    const group = await getGroupById(db, groupId);
    return group.toJSON();
  }

  @Post('/setUserStatus')
  async setUserStatus(
    @ReqLog('user_status_change.json.log') userStatusChangeLogger: ReqLogger,
    @CurrentUser({ required: true }) currentUser: User,
    @CurrentDB() db: Sequelize,
    @BodyParam('user_id', { required: true }) userId: number,
    @BodyParam('status', { required: true }) status: UserStatus,
  ) {
    if (!(await currentUser.hasPermission('user.edit.status'))) {
      throw new UIError('无权修改');
    }
    const aimUser = await getUser(db, userId);
    const beforeStatus = aimUser.status;
    aimUser.status = status;
    await aimUser.save();
    userStatusChangeLogger.log({ userId: aimUser.id, beforeStatus, newStatus: status });
  }

  @Post('/changePassword')
  async changePassword(
    @CurrentUser({ required: true }) currentUser: User,
    @BodyParam('old_password', { required: true }) oldPassword: string,
    @BodyParam('new_password', { required: true }) newPassword: string,
  ) {
    if (newPassword.length < 6) throw new UIError('密码长度必须大于等于 6 位');
    if (!verifyPassword(oldPassword, currentUser.password)) throw new UIError('原密码错误');
    currentUser.password = hashPassword(newPassword);
    await currentUser.save();
    return true;
  }

  @Post('/sendBindEmailVerifyCode')
  async sendBindEmailVerifyCode(
    @CurrentDB() db: Sequelize,
    @CurrentUser({ required: true }) currentUser: User,
    @BodyParam('email', { required: true }) email: string,
  ) {
    if (BindEmailVerifyCodeCacheMap.get(email)?.sendTime > Date.now() - 1000 * 30) {
      // 30s 内仅发送一条验证码邮件
      throw new UIError('验证码发送太频繁，请稍后再试');
    }
    if ((await getUserByEmail(db, email)) != null) {
      throw new UIError('该邮箱已被其他用户绑定，请重新输入');
    }
    const verifyCode = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');

    await mailToEmail({
      db,
      mailKey: `verifyCode${verifyCode}`,
      email,
      title: '论坛绑定邮箱验证',
      htmlBody: `您的验证码为 <b>${verifyCode}</b><br/><br/>验证码5分钟内有效，请尽快输入`,
    });

    BindEmailVerifyCodeCacheMap.set(email, { code: verifyCode, sendTime: Date.now() });
    return true;
  }

  @Post('/sendUnBindEmailVerifyCode')
  async sendUnBindEmailVerifyCode(@CurrentDB() db: Sequelize, @CurrentUser({ required: true }) currentUser: User) {
    const email = currentUser.email;
    if (!email) {
      throw new UIError('未绑定邮箱');
    }
    if (UnBindEmailVerifyCodeCacheMap.get(email)?.sendTime > Date.now() - 1000 * 30) {
      // 30s 内仅发送一条验证码邮件
      throw new UIError('验证码发送太频繁，请稍后再试');
    }
    const verifyCode = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');

    await mailToEmail({
      db,
      mailKey: `verifyCode${verifyCode}`,
      email,
      title: '论坛解绑邮箱验证',
      htmlBody: `您的验证码为 <b>${verifyCode}</b><br/><br/>验证码5分钟内有效，请尽快输入`,
    });

    UnBindEmailVerifyCodeCacheMap.set(email, { code: verifyCode, sendTime: Date.now() });
    return true;
  }

  @Post('/bindEmail')
  async bindEmail(
    @CurrentDB() db: Sequelize,
    @CurrentUser({ required: true }) currentUser: User,
    @BodyParam('verify_code', { required: true }) verify_code: string,
    @BodyParam('email', { required: true }) email: string,
  ) {
    if (BindEmailVerifyCodeCacheMap.get(email)?.code !== verify_code) {
      throw new UIError('验证码校验失败');
    }
    if ((await getUserByEmail(db, email)) != null) {
      throw new UIError('该邮箱已被其他用户绑定，请重新输入');
    }
    // 验证码校验成功
    BindEmailVerifyCodeCacheMap.del(email);
    currentUser.email = email;
    await currentUser.save();
    return true;
  }

  @Post('/removeBindEmail')
  async removeBindEmail(
    @CurrentDB() db: Sequelize,
    @CurrentUser({ required: true }) currentUser: User,
    @BodyParam('verify_code', { required: true }) verify_code: string,
  ) {
    const email = currentUser.email;
    if (!email) {
      throw new UIError('未绑定邮箱');
    }
    if (UnBindEmailVerifyCodeCacheMap.get(email)?.code !== verify_code) {
      throw new UIError('验证码校验失败');
    }
    // 验证码校验成功
    UnBindEmailVerifyCodeCacheMap.del(email);
    currentUser.email = null;
    await currentUser.save();
    return true;
  }

  @Post('/enableMsgToEmail')
  async enableMsgToEmail(
    @CurrentDB() db: Sequelize,
    @CurrentUser({ required: true }) currentUser: User,
    @BodyParam('enable', { required: true }) enable: boolean,
  ) {
    if (enable && !currentUser.email) {
      throw new UIError('未绑定邮箱，请先绑定');
    }
    if ((await getSettingValue(db, 'site_enable_email')) !== '1') {
      throw new UIError('论坛未开启邮箱消息通知功能');
    }
    currentUser.msg_to_email_enable = enable;
    await currentUser.save();
    return true;
  }

  @Get('/getMyEmail')
  async getMyEmail(@CurrentUser({ required: true }) currentUser: User) {
    return currentUser.email;
  }

  @Get('/list')
  async list(
    @ReqLog('list_user.json.log') listUserLogger: ReqLogger,
    @CurrentUser({ required: true }) currentUser: User,
    @CurrentDB() db: Sequelize,
    @QueryParam('user_id') userid: number,
    @QueryParam('username') username: string,
    @QueryParam('nickname') nickname: string,
    @QueryParam('nickname_like') nicknameLike: string,
    @QueryParam('group_id') groupIdArrStr: string,
    @QueryParam('status') statusArrStr: string,
    @QueryParam('page_offset') offset = 0,
    @QueryParam('page_limit') limit = 20,
  ) {
    if (!(await currentUser.hasPermission('user.view'))) {
      throw new UIError('无权查看用户信息');
    }
    if (!(await currentUser.hasPermission('user.search'))) {
      throw new UIError('无权搜索用户');
    }
    if (limit > 100) {
      throw new BadRequestError('limit should <= 100');
    }
    const inGroupUserIds = [];
    if (groupIdArrStr) {
      const groupIds = groupIdArrStr
        .split(',')
        .filter(Boolean)
        .map((str) => parseInt(str));
      for (const groupId of groupIds) {
        inGroupUserIds.push(...(await getGroupUserIds(db, groupId)));
      }
      if (userid && !inGroupUserIds.includes(userid)) {
        // 指定用户 id 不在指定分组内
        const result = [];
        result[WrapDataExtraKey] = { totalCount: 0 };
        return result;
      }
    }
    let statusArr: UserStatus[];
    if (statusArrStr) {
      statusArr = statusArrStr
        .split(',')
        .filter(Boolean)
        .map((str) => parseInt(str));
    }
    const whereOption: WhereOptions<Partial<User>> = {
      ...(inGroupUserIds.length ? { id: { [Op.in]: inGroupUserIds } } : {}),
      ...(userid ? { id: userid } : {}),
      ...(username ? { username } : {}),
      ...(nickname ? { nickname } : {}),
      ...(statusArr ? { status: { [Op.in]: statusArr } } : {}),
      ...(nicknameLike ? { nickname: { [Op.like]: `%${nicknameLike}%` } } : {}),
    };
    const UserModel = await getUserModel(db);
    const findUsers = await UserModel.findAll({
      where: whereOption,
      offset,
      limit,
    });
    const result = await Promise.all(findUsers.map((user) => user.toViewJSON({ showRealEmail: !!currentUser.isAdmin() })));
    const totalCount = await UserModel.count({ where: whereOption });
    result[WrapDataExtraKey] = {
      totalCount,
    };
    listUserLogger.log({
      userid,
      username,
      nickname,
      groupIdArrStr,
      status: statusArrStr,
      offset,
      limit,
      resultLength: result.length,
      totalCount,
    });
    return result;
  }

  @Get('/:id')
  async getById(@CurrentUser() currentUser: User, @CurrentDB() db: Sequelize, @Param('id') id: number) {
    if (!id) throw new UIError('参数缺失');
    const hasViewUserPermission = currentUser
      ? currentUser.id === id || (await currentUser.hasPermission('user.view'))
      : await hasPermission(db, GROUP_ID_TOURIST, 'user.view');
    if (!hasViewUserPermission) {
      throw new UIError('无权查看用户信息');
    }
    const user = await getUser(db, id);
    if (user == null) throw new UIError('用户未找到');
    return user.toViewJSON();
  }

  @Post('/:id')
  async modifyUser(
    @ReqLog('user_group_change.json.log') userGroupChangeLogger: ReqLogger,
    @ReqLog('user_status_change.json.log') userStatusChangeLogger: ReqLogger,
    @ReqLog('user_info_change.json.log') userInfoChangeLogger: ReqLogger,
    @CurrentUser({ required: true }) currentUser: User,
    @CurrentDB() db: Sequelize,
    @Param('id') id: number,
    @Body() modifyRequest: ModifyUserRequest,
  ) {
    if (!id) throw new UIError('参数缺失');
    const user = await getUser(db, id);
    if (user == null) throw new UIError('用户未找到');

    const nickname = modifyRequest.nickname?.trim();
    if (nickname?.length > 50 && !(await currentUser.isAdmin())) {
      throw new UIError('昵称过长，最多50个字符');
    }
    if (nickname === '管理员' || nickname === '系统管理员') {
      throw new UIError('禁止使用该昵称');
    }
    if (modifyRequest.signature?.length > 200) {
      throw new UIError('个性签名过长，最多200个字符');
    }

    // 检查昵称唯一性设置
    if ((await getSettingValue(db, 'user_nickname_unique')) === '1' && nickname) {
      const existingUser = await getUserByNickName(db, nickname);
      if (existingUser) {
        throw new UIError('该昵称已被使用');
      }
    }

    const userBaseInfoChanged =
      modifyRequest.nickname !== user.nickname || modifyRequest.signature !== user.signature || modifyRequest.avatar !== user.avatar;
    if (user.id !== currentUser.id && userBaseInfoChanged) {
      if (!(await currentUser.hasPermission('user.edit.base'))) {
        throw new UIError('无权修改他人信息');
      }
    }
    if (!modifyRequest) return user.toViewJSON();

    if ('group_id' in modifyRequest) {
      if (modifyRequest.group_id === GROUP_ID_ADMIN || modifyRequest.group_id === GROUP_ID_TOURIST) {
        throw new UIError('不支持设置为该用户角色');
      }
      const beforeGroupId = await user.getGroupId();
      if (modifyRequest.group_id !== beforeGroupId) {
        if (!(await currentUser.hasPermission('user.edit.group'))) {
          throw new UIError('无权修改用户分组');
        }
        await user.setGroupId(modifyRequest.group_id);
        userGroupChangeLogger.log({ userId: user.id, beforeGroupId, newGroupId: modifyRequest.group_id });
      }
    }

    const changedInfo = {} as Partial<User>;

    if ('status' in modifyRequest && user.status !== modifyRequest.status) {
      if (!(await currentUser.hasPermission('user.edit.status'))) {
        throw new UIError('无权修改用户状态');
      }
      changedInfo.status = modifyRequest.status;
      if (modifyRequest.reject_reason) {
        changedInfo.reject_reason = modifyRequest.reject_reason;
      }
      if (modifyRequest.status === UserStatus.Normal && user.reject_reason) {
        changedInfo.reject_reason = ''; // 用户状态变为正常，清空拒绝原因
      }
    }

    if (nickname && nickname !== user.nickname) {
      changedInfo.nickname = nickname;
      user.nickname = nickname;
    }
    if ('avatar' in modifyRequest && user.avatar !== modifyRequest.avatar) {
      changedInfo.avatar = modifyRequest.avatar;
      changedInfo.avatar_at = new Date();
    }
    if ('signature' in modifyRequest && user.signature !== modifyRequest.signature) {
      changedInfo.signature = modifyRequest.signature;
    }
    if (!Object.keys(changedInfo).length) {
      // 无修改
      return user.toViewJSON();
    }

    const beforeChangedStatus = 'status' in changedInfo ? user.status : null;

    Object.assign(user, changedInfo);
    await user.save();

    if (beforeChangedStatus) {
      userStatusChangeLogger.log({ userId: user.id, beforeStatus: beforeChangedStatus, newStatus: changedInfo.status });
    }
    userInfoChangeLogger.log({ ...changedInfo, userId: user.id });

    return user.toViewJSON();
  }
}
