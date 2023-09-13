import { Body, BodyParam, Get, JsonController, Post } from 'routing-controllers';
import { Sequelize } from 'sequelize';
import CurrentDB from '../decorators/CurrentDB';
import { User } from '../../../models/User';
import CurrentDomain from '../decorators/CurrentDomain';
import { PermissionType, setGroupPermissions } from '../../../models/GroupPermission';
import CurrentUser from '../decorators/CurrentUser';
import { createGroup, getGroupById, getGroupByName, getGroupModel, listGroup, removeGroup } from '../../../models/Group';
import { getGroupUserIds } from '../../../models/GroupUser';
import UIError from '../../../utils/ui-error';
import { GROUP_ID_ADMIN } from '../const';

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
      throw new UIError('角色名已存在');
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

    if (groupId === GROUP_ID_ADMIN) {
      throw new UIError('不允许删除 admin 角色');
    }
    if ((await getGroupUserIds(db, groupId))?.length) {
      throw new UIError('该角色下还有用户，不允许删除');
    }
    const group = await getGroupById(db, groupId);
    if (group.default) {
      throw new UIError('不允许删除默认角色');
    }
    if ((await listGroup(db)).length <= 1) {
      throw new UIError('不允许清空角色');
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
    @BodyParam('group_icon') groupIcon: string,
  ) {
    if (!(await currentUser.isAdmin())) throw new UIError('无权操作');

    const group = await getGroupById(db, groupId);
    if (!group) {
      throw new UIError('未找到角色');
    }
    if (groupDefault && groupId === GROUP_ID_ADMIN) {
      throw new UIError('不能设置 论坛管理员 为默认角色');
    }

    const GroupModel = await getGroupModel(db);
    await db.transaction(async (t) => {
      if (groupName) {
        group.name = groupName;
      }
      if (groupIcon != null) {
        group.icon = groupIcon;
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
    let groups = await listGroup(db);
    if (!groups.some((g) => g.id === GROUP_ID_ADMIN)) {
      // 自动添加 admin 的角色分组（补齐旧数据）
      const GroupModel = await getGroupModel(db);
      const defaultGroup = GroupModel.build({
        id: GROUP_ID_ADMIN,
        name: '论坛管理员',
      });
      await defaultGroup.save();
      groups = await listGroup(db);
    }
    return (groups || []).map((group) => group.toJSON());
  }
}
