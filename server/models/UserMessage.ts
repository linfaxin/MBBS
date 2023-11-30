import * as dayjs from 'dayjs';
import { Model, Sequelize, DataTypes, Op } from 'sequelize';
import { mailToUser } from '../utils/mail-util';
import { getDefaultHost } from '../utils/bind-host-util';
import { getDBNameFromDB } from './db';
import { formatSubString } from '../utils/format-utils';

/**
 * 用户消息模型
 */
export class UserMessage extends Model<Partial<UserMessage>> {
  /** 消息 id */
  id: number;
  /** 消息标题 */
  title: string;
  /** 消息内容 */
  content?: string;
  /** 消息链接（优先使用相对地址） */
  link?: string;
  /** 消息目标用户ID */
  user_id: number;
  /** 消息来源用户ID（回复帖子触发消息的回帖人） */
  from_user_id?: number;
  /** 邮件触发结果 */
  send_mail_result?: 'suc' | string;
  /** 未读消息合并 key */
  unread_merge_key: string;
  /** 创建时间 */
  created_at: Date;
  /** 更新时间 */
  updated_at: Date;
  /** 消息已读时间 */
  read_at?: Date;
}

export async function insertUserMessage(
  db: Sequelize,
  msgData: {
    /** 消息标题 */
    title: string;
    /** 消息内容 */
    content?: string;
    /** 消息链接 */
    link?: string;
    /** 消息目标用户ID */
    user_id: number;
    /** 消息来源用户ID（回复帖子触发消息的回帖人） */
    from_user_id?: number;
    /** 未读消息合并 key */
    unread_merge_key?: string;
  },
) {
  if (msgData.from_user_id === msgData.user_id) {
    // 无需自己触发消息给自己
    return;
  }
  msgData.content = `${dayjs().format('YYYY-MM-DD HH:mm:ss')}\n${msgData.content || ''}`; // 消息内容开头加入当前时间

  const UserMessageModel = await getUserMessageModel(db);

  const shouldSendMail =
    (await UserMessageModel.count({
      where: {
        user_id: msgData.user_id, // 指定用户
        read_at: { [Op.is]: null }, // 未读
        send_mail_result: 'suc', // 邮件发送成功
        created_at: { [Op.gt]: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // 24 小时内
      },
    })) == 0;

  const unReadSameKeyMsg = msgData.unread_merge_key
    ? await UserMessageModel.findOne({
        where: {
          user_id: msgData.user_id, // 指定用户
          read_at: { [Op.is]: null }, // 未读
          unread_merge_key: msgData.unread_merge_key, // 相同消息
        },
      })
    : null;

  if (unReadSameKeyMsg) {
    // 有相同未读 key 的消息，无需插入新消息（避免相同消息过多）
    const mergedContent = formatSubString(`${msgData.content}\n\n${unReadSameKeyMsg.content}`, 500);
    Object.assign(unReadSameKeyMsg, msgData);
    unReadSameKeyMsg.content = mergedContent;

    if (shouldSendMail) {
      try {
        unReadSameKeyMsg.send_mail_result = (await sendUnreadMsgCountMailToUser(db, msgData.user_id)) ? 'suc' : '';
      } catch (e: any) {
        unReadSameKeyMsg.send_mail_result = `fail: ${e?.message || String(e)}`;
      }
    }
    await unReadSameKeyMsg.save();
    return;
  }

  let send_mail_result: string | undefined;
  if (shouldSendMail) {
    try {
      send_mail_result = (await sendUnreadMsgCountMailToUser(db, msgData.user_id)) ? 'suc' : '';
    } catch (e: any) {
      send_mail_result = `fail: ${e?.message || String(e)}`;
    }
  }
  // 插入数据
  await UserMessageModel.create({
    ...msgData,
    send_mail_result,
  });
}

export async function deleteMessage(db: Sequelize, user_id: number, msgId: number) {
  const UserMessageModel = await getUserMessageModel(db);
  await UserMessageModel.destroy({
    where: {
      user_id: user_id, // 指定用户
      id: msgId,
    },
  });
}

export async function deleteAllMessage(db: Sequelize, user_id: number) {
  const UserMessageModel = await getUserMessageModel(db);
  await UserMessageModel.destroy({
    where: {
      user_id: user_id, // 指定用户
    },
  });
}

export async function markMessageRead(db: Sequelize, user_id: number, msgId: number): Promise<UserMessage> {
  const UserMessageModel = await getUserMessageModel(db);
  const unReadMsg = await UserMessageModel.findOne({
    where: {
      user_id: user_id, // 指定用户
      id: msgId,
    },
  });
  if (unReadMsg.read_at) {
    // 消息已读，无需修改
    return unReadMsg;
  }
  if (!unReadMsg) {
    throw new Error('未找到目标消息');
  }
  unReadMsg.read_at = new Date();
  await unReadMsg.save({ silent: true });
  return unReadMsg;
}

export async function markAllUnReadMessageRead(db: Sequelize, user_id: number) {
  const UserMessageModel = await getUserMessageModel(db);
  const [count] = await UserMessageModel.update(
    {
      read_at: new Date(),
    },
    {
      silent: true,
      where: {
        user_id: user_id, // 指定用户
        read_at: { [Op.is]: null }, // 未读
      },
    },
  );
  return count;
}

// 发送 "你有x条未读消息" 邮件给用户
async function sendUnreadMsgCountMailToUser(db: Sequelize, user_id: number): Promise<boolean> {
  return await mailToUser({
    db,
    mailKey: 'msgCenterUnreadCount',
    userId: user_id,
    title: '未读消息提醒',
    htmlBody: `你在论坛有消息未读 <br/><br/><a href='http://${await getDefaultHost(
      getDBNameFromDB(db),
    )}/#/personal-message-center'>点击查看</a>`,
  });
}

const waitDBSync = new WeakMap<Sequelize, Promise<any>>();
export async function getUserMessageModel(db: Sequelize): Promise<typeof UserMessage> {
  if (waitDBSync.has(db)) {
    await waitDBSync.get(db);
  }
  if (db.models && db.models.UserMessage) {
    return db.models.UserMessage as typeof UserMessage;
  }
  class DBUserMessage extends UserMessage {}
  DBUserMessage.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        unique: true,
        primaryKey: true,
      },
      title: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      content: {
        type: DataTypes.TEXT,
      },
      link: {
        type: DataTypes.TEXT,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      from_user_id: {
        type: DataTypes.INTEGER,
      },
      send_mail_result: {
        type: DataTypes.TEXT,
      },
      unread_merge_key: {
        type: DataTypes.TEXT,
      },
      created_at: {
        type: DataTypes.DATE,
      },
      updated_at: {
        type: DataTypes.DATE,
      },
      read_at: {
        type: DataTypes.DATE,
      },
    },
    {
      sequelize: db,
      modelName: 'UserMessage',
      tableName: 'user_message',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [{ fields: ['user_id'] }, { fields: ['created_at'] }, { fields: ['updated_at'] }, { fields: ['read_at'] }],
    },
  );

  waitDBSync.set(db, DBUserMessage.sync({ alter: { drop: false } }));
  await waitDBSync.get(db);
  waitDBSync.delete(db);
  return DBUserMessage;
}
