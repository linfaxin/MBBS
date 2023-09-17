import { BodyParam, Get, JsonController, Post, QueryParam } from 'routing-controllers';
import { Op, Sequelize } from 'sequelize';
import CurrentDB from '../decorators/CurrentDB';
import { User } from '../../../models/User';
import CurrentDomain from '../decorators/CurrentDomain';
import CurrentUser from '../decorators/CurrentUser';
import {
  deleteAllMessage,
  deleteMessage,
  getUserMessageModel,
  markAllUnReadMessageRead,
  markMessageRead,
} from '../../../models/UserMessage';
import { WrapDataExtraKey } from '../global-interceptors/WrapDataInterceptors';

@JsonController('/message')
export default class CategoryController {
  @Post('/removeMessage')
  async removeMessage(
    @CurrentDB() db: Sequelize,
    @CurrentUser({ required: true }) currentUser: User,
    @CurrentDomain() domain: string,
    @BodyParam('msg_id', { required: true }) msgId: number,
  ) {
    await deleteMessage(db, currentUser.id, msgId);
    return true;
  }

  @Post('/removeAllMessage')
  async removeAllMessage(@CurrentDB() db: Sequelize, @CurrentUser({ required: true }) currentUser: User, @CurrentDomain() domain: string) {
    await deleteAllMessage(db, currentUser.id);
    return true;
  }

  @Get('/readMessage')
  async readMessage(
    @CurrentDB() db: Sequelize,
    @CurrentUser({ required: true }) currentUser: User,
    @CurrentDomain() domain: string,
    @QueryParam('msg_id', { required: true }) msgId: number,
  ) {
    const msg = await markMessageRead(db, currentUser.id, msgId);
    return msg.toJSON();
  }

  @Post('/readAllMessage')
  async readAllMessage(@CurrentDB() db: Sequelize, @CurrentUser({ required: true }) currentUser: User, @CurrentDomain() domain: string) {
    await markAllUnReadMessageRead(db, currentUser.id);
    return true;
  }

  @Get('/listMessage')
  async listMessage(
    @CurrentDB() db: Sequelize,
    @CurrentUser() currentUser: User,
    @QueryParam('page_offset') offset = 0,
    @QueryParam('page_limit') limit = 20,
    @QueryParam('sort') sort: string, // [keyof UserMessage | `-${keyof UserMessage}`].join(',')
  ) {
    const UserMessageModel = await getUserMessageModel(db);

    const order = `${sort || '-updated_at'}`
      .split(',')
      .filter(Boolean)
      .map((o) => {
        if (o[0] === '-') {
          return [o.substring(1), 'DESC'];
        }
        return [o];
      }) as any;

    const messages = (
      await UserMessageModel.findAll({
        where: {
          user_id: currentUser.id,
        },
        order,
        offset,
        limit,
      })
    ).map((m) => m.toJSON());

    messages[WrapDataExtraKey] = {
      totalCount: await UserMessageModel.count({ where: { user_id: currentUser.id } }),
      unreadCount: await UserMessageModel.count({
        where: {
          user_id: currentUser.id,
          read_at: {
            [Op.is]: null,
          },
        },
      }),
    };

    return messages;
  }

  @Get('/unreadMessageCount')
  async unreadMessageCount(@CurrentDB() db: Sequelize, @CurrentUser() currentUser: User) {
    const UserMessageModel = await getUserMessageModel(db);
    return await UserMessageModel.count({
      where: {
        user_id: currentUser.id,
        read_at: {
          [Op.is]: null,
        },
      },
    });
  }
}
