import { Body, BodyParam, Get, JsonController, Post } from 'routing-controllers';
import { Sequelize } from 'sequelize';
import CurrentDB from '../decorators/CurrentDB';
import { User } from '../../../models/User';
import CurrentDomain from '../decorators/CurrentDomain';
import { PermissionType, setGroupPermissions } from '../../../models/GroupPermission';
import CurrentUser from '../decorators/CurrentUser';
import { createGroup, getGroupById, getGroupByName, getGroupModel, listGroup, removeGroup } from '../../../models/Group';
import { getGroupUserIds } from '../../../models/GroupUser';
import { getAllSettings, setSettingValue, SettingKeyValue } from '../../../models/Settings';
import UIError from '../../../utils/ui-error';

@JsonController('/group')
export default class GroupController {
  @Post('/addGroup')
  async addGroup(
    @CurrentDB() db: Sequelize,
    @CurrentUser({ required: true }) currentUser: User,
    @CurrentDomain() domain: string,
    @BodyParam('group_name', { required: true }) groupName: string,
    @BodyParam('permissions') permissions: PermissionType[],
  ) {
    if (!(await currentUser.isAdmin())) throw new UIError('无权操作');

    if (await getGroupByName(db, groupName)) {
      throw new UIError('分组名已存在');
    }
    const group = await createGroup(db, groupName);
    if (permissions?.length) {
      await setGroupPermissions(db, group.id, permissions);
    }
    return group.toJSON();
  }

  @Post('/removeGroup')
  async removeGroup(
    @CurrentDB() db: Sequelize,
    @CurrentUser({ required: true }) currentUser: User,
    @CurrentDomain() domain: string,
    @BodyParam('group_id', { required: true }) groupId: number,
  ) {
    if (!(await currentUser.isAdmin())) throw new UIError('无权操作');

    if ((await getGroupUserIds(db, groupId))?.length) {
      throw new UIError('该分组下还有用户，不允许删除');
    }
    const group = await getGroupById(db, groupId);
    if (group.default) {
      throw new UIError('不允许删除默认分组');
    }
    if ((await listGroup(db)).length <= 1) {
      throw new UIError('不允许清空分组');
    }

    return removeGroup(db, groupId);
  }

  @Post('/setGroup')
  async setGroup(
    @CurrentDB() db: Sequelize,
    @CurrentUser({ required: true }) currentUser: User,
    @CurrentDomain() domain: string,
    @BodyParam('group_id', { required: true }) groupId: number,
    @BodyParam('group_name') groupName: string,
    @BodyParam('group_default') groupDefault: boolean,
  ) {
    if (!(await currentUser.isAdmin())) throw new UIError('无权操作');

    const group = await getGroupById(db, groupId);
    if (!group) {
      throw new UIError('未找到分组');
    }

    const GroupModel = await getGroupModel(db);
    await db.transaction(async (t) => {
      if (groupName) {
        group.name = groupName;
      }
      if (groupDefault) {
        await GroupModel.update({ default: false }, { where: { default: true }, transaction: t });
        group.default = true;
      }
      await group.save({ transaction: t });
    });

    return true;
  }

  @Get('/listGroup')
  async listGroup(@CurrentDB() db: Sequelize, @CurrentUser() currentUser: User) {
    const groups = await listGroup(db);
    return (groups || []).map((group) => group.toJSON());
  }
}
