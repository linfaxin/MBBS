import { BodyParam, Get, JsonController, Post, QueryParam } from 'routing-controllers';
import { Sequelize } from 'sequelize';
import CurrentDB from '../decorators/CurrentDB';
import { User } from '../../../models/User';
import CurrentDomain from '../decorators/CurrentDomain';
import {
  addGroupPermission,
  AllGlobalPermissions,
  getGroupPermissions,
  PermissionType,
  removeGroupPermission,
  setGroupPermissions,
} from '../../../models/GroupPermission';
import CurrentUser from '../decorators/CurrentUser';
import UIError from '../../../utils/ui-error';

@JsonController('/permissions')
export default class PermissionController {
  @Get('/getMyPermissions')
  async getMyPermissions(@CurrentUser({ required: true }) currentUser: User, @CurrentDB() db: Sequelize) {
    if (await currentUser.isAdmin()) {
      return AllGlobalPermissions;
    }
    return await getGroupPermissions(db, await currentUser.getGroupId());
  }

  @Get('/getPermissions')
  async getPermissions(
    @CurrentUser({ required: true }) currentUser: User,
    @CurrentDB() db: Sequelize,
    @QueryParam('group_id', { required: true }) groupId: number,
  ) {
    return await getGroupPermissions(db, groupId);
  }

  @Post('/addPermission')
  async addPermission(
    @CurrentDB() db: Sequelize,
    @CurrentUser({ required: true }) currentUser: User,
    @CurrentDomain() domain: string,
    @BodyParam('group_id', { required: true }) groupId: number,
    @BodyParam('permission', { required: true }) permission: PermissionType,
  ) {
    if (!(await currentUser.isAdmin())) throw new UIError('无权操作');

    await addGroupPermission(db, groupId, permission);
    return true;
  }

  @Post('/removePermission')
  async removePermission(
    @CurrentDB() db: Sequelize,
    @CurrentUser({ required: true }) currentUser: User,
    @CurrentDomain() domain: string,
    @BodyParam('group_id', { required: true }) groupId: number,
    @BodyParam('permission', { required: true }) permission: PermissionType,
  ) {
    if (!(await currentUser.isAdmin())) throw new UIError('无权操作');

    return await removeGroupPermission(db, groupId, permission);
  }
  @Post('/setPermissions')
  async setPermissions(
    @CurrentDB() db: Sequelize,
    @CurrentUser({ required: true }) currentUser: User,
    @CurrentDomain() domain: string,
    @BodyParam('group_id', { required: true }) groupId: number,
    @BodyParam('permissions', { required: true }) permissions: PermissionType[],
  ) {
    if (!(await currentUser.isAdmin())) throw new UIError('无权操作');

    await setGroupPermissions(db, groupId, permissions);
    return true;
  }
}
