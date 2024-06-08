import { Body, BodyParam, Get, JsonController, Post } from 'routing-controllers';
import { Sequelize } from 'sequelize';
import CurrentDB from '../decorators/CurrentDB';
import { User } from '../../../models/User';
import CurrentDomain from '../decorators/CurrentDomain';
import CurrentUser from '../decorators/CurrentUser';
import { getAllSettings, setSettingValue, SettingKeyValue } from '../../../models/Settings';
import UIError from '../../../utils/ui-error';

@JsonController('/setting')
export default class SettingController {
  @Get('/getAll')
  async getAll(@CurrentDB() db: Sequelize, @CurrentUser({ enableOnSiteClose: true }) currentUser: User) {
    const allSetting = await getAllSettings(db);

    if (!currentUser || !(await currentUser.isAdmin())) {
      // 以 __ 开头的字段 无需返回给前端
      Object.keys(allSetting).forEach((key) => {
        if (key.startsWith('__')) allSetting[key] = undefined;
      });
    }

    return allSetting;
  }

  @Post('/set')
  async setSetting(
    @CurrentDB() db: Sequelize,
    @CurrentUser({ required: true }) currentUser: User,
    @CurrentDomain() domain: string,
    @BodyParam('key', { required: true }) key: string,
    @BodyParam('value') value: string,
  ) {
    if (!(await currentUser.isAdmin())) throw new UIError('无权操作');
    await setSettingValue(db, { [key]: value });
    return true;
  }

  @Post('/batchSet')
  async batchSetSetting(
    @CurrentDB() db: Sequelize,
    @CurrentUser({ required: true }) currentUser: User,
    @CurrentDomain() domain: string,
    @Body() update: Partial<SettingKeyValue>,
  ) {
    if (!(await currentUser.isAdmin())) throw new UIError('无权操作');
    await setSettingValue(db, update);
    return true;
  }
}
