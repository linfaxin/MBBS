import { createTransport, Transporter } from 'nodemailer';
import { Sequelize } from 'sequelize';
import * as LRUCache from 'lru-cache';
import { getUser, getUserByName, User } from '../models/User';
import { getSettingValue } from '../models/Settings';
import { getDBNameFromDB } from '../models/db';
import { getLogger } from './log-util';
import { getDefaultHost } from './bind-host-util';

import SMTPTransport = require('nodemailer/lib/smtp-transport');

// create reusable transporter object using SMTP transport
let _getTransporter: Promise<Transporter<SMTPTransport.SentMessageInfo>>;
let usingSmtpHostAndPort: string;
let usingSmtpUsername: string;
let usingSmtpPassword: string;

function getMailTransporter(db: Sequelize): Promise<Transporter<SMTPTransport.SentMessageInfo>> {
  if (!_getTransporter) {
    _getTransporter = Promise.resolve()
      .then(async () => {
        const hostAndPort = await getSettingValue(db, '__internal_mail_config_smtp_host_and_port');
        const mailUserName = await getSettingValue(db, '__internal_mail_config_smtp_username');
        const mailPassword = await getSettingValue(db, '__internal_mail_config_smtp_password');

        if (!hostAndPort) throw new Error('邮件服务配置缺失（域名端口）');
        if (!mailUserName) throw new Error('邮件服务配置缺失（登录用户名）');
        if (!mailPassword) throw new Error('邮件服务配置缺失（登录密码）');

        const t = createTransport({
          host: hostAndPort.split(':')[0],
          port: parseInt(hostAndPort.split(':')[1]) || 25,
          // secure: true, // use SSL, the port is 465
          auth: {
            user: mailUserName, // user name
            pass: mailPassword, // password
          },
        });
        if (!(await t.verify())) {
          throw new Error('发件邮箱登录失败');
        }
        usingSmtpHostAndPort = hostAndPort;
        usingSmtpUsername = mailUserName;
        usingSmtpPassword = mailPassword;
        return t;
      })
      .catch((e) => {
        _getTransporter = undefined;
        throw e;
      });
  }
  return _getTransporter.then(async (t) => {
    const hostAndPort = await getSettingValue(db, '__internal_mail_config_smtp_host_and_port');
    const mailUserName = await getSettingValue(db, '__internal_mail_config_smtp_username');
    const mailPassword = await getSettingValue(db, '__internal_mail_config_smtp_password');

    if (hostAndPort !== usingSmtpHostAndPort || mailUserName !== usingSmtpUsername || mailPassword !== usingSmtpPassword) {
      // 邮箱配置发生更改，用新的配置重新登录
      _getTransporter = undefined;
      return getMailTransporter(db);
    }

    return t;
  });
}

async function sendMail(db: Sequelize, mailAddress: string[] | string, title: string, htmlBody: string) {
  if (!mailAddress.includes('@')) {
    throw new Error('邮箱地址合适不正确，请检查');
  }

  if (!(await getSettingValue(db, 'site_enable_email'))) {
    throw new Error('论坛未开启邮件功能');
  }

  const transporter = await getMailTransporter(db);
  const mailFromUser = await getSettingValue(db, '__internal_mail_config_smtp_username');

  return new Promise<void>((resolve, reject) => {
    // send mail with defined transport object
    transporter.sendMail(
      {
        from: `论坛消息通知<${mailFromUser}>`, // sender address mailfrom must be same with the user
        to: [].concat(mailAddress).join(','), // list of receivers
        // cc:'haha<xxx@xxx.com>', // copy for receivers
        // bcc:'haha<xxxx@xxxx.com>', // secret copy for receivers
        subject: title, // Subject line
        // text: 'Hello world', // plaintext body
        // replyTo:'xxxxx@xxxxx.com',//custom reply address
        html: htmlBody, // html body
      },
      (error, info) => {
        if (error) {
          return reject(error);
        }
        resolve();
      },
    );
  });
}

async function checkShouldIgnoreMail(mailToUser: User, mailKey: string) {
  if (mailKey.startsWith('verifyCode')) {
    // 验证码消息不过滤
    return false;
  }

  if (mailKey.startsWith('manage') && !(await mailToUser.isAdmin())) {
    // 管理类消息 只能管理员接收
    console.error(`manage type mail can only send to admin: "${mailKey}"`);
    return true;
  }

  if (
    !mailKey.startsWith('manage') && // 非管理类消息
    !mailToUser.msg_to_email_enable // 用户未开启 邮箱消息通知
  ) {
    // 无需发送消息
    return true;
  }

  return false;
}

export async function mailToUser(options: Omit<MailOptions, 'email'>) {
  const { db, userName, mailKey, userId } = options;
  const user = userId ? await getUser(db, userId) : await getUserByName(db, userName);

  // 发送邮件前置检查
  if (await checkShouldIgnoreMail(user, mailKey)) {
    return;
  }

  if (!user) throw new Error('用户未找到');
  if (!user.email) throw new Error('用户未绑定邮箱');

  await mailToEmail({ ...options, email: user.email });
}

let sendMailRecordIdNext = 1;
const recentSendMailCountAllDBLimit = 500; // 短时间最多发送的邮件总量
const recentSendMailCountPeerDBLimit = 100; // 短时间内一个站点最多发送的邮件个数
const recentSendMailCountPeerEmailLimit = 10; // 短时间内向 同一个邮箱地址 最多发送个数
const recentSendMailRecords = new LRUCache<number, { dbName: string; mailKey: string; email: string; time: number }>({
  // <recordId, {}>
  max: 1000,
  maxAge: 10 * 60 * 1000, // 10min
});

export interface MailOptions {
  db: Sequelize;
  mailKey: 'manageUser' | 'manageThread' | `manageViewThread${number}` | `viewThread${number}` | `verifyCode${string}`; // 对同一个 email 发送邮件时，相同 mailKey 的邮件短时间内仅会发送一封
  userName?: string;
  userId?: number;
  email: string;
  title: string;
  htmlBody: string;
}

export async function mailToEmail(options: MailOptions) {
  const { db, mailKey, userId, userName, email, title, htmlBody } = options;
  const mailToUser = userId ? await getUser(db, userId) : await getUserByName(db, userName);

  if (!(await getSettingValue(db, 'site_enable_email'))) {
    throw new Error('论坛未开启邮件功能');
  }

  // 发送邮件前置检查
  if (await checkShouldIgnoreMail(mailToUser, mailKey)) {
    return;
  }

  // 开始发送消息
  try {
    const dbName = getDBNameFromDB(db);
    recentSendMailRecords.prune(); // 清理 maxAge 过期的记录
    const records = recentSendMailRecords.values();
    if (records.length >= recentSendMailCountAllDBLimit) {
      throw new Error('邮件系统频率异常，请稍后再试');
    }
    let recentSendMailCountPeerDB = 0;
    let recentSendMailCountPeerEmail = 0;
    for (const record of records) {
      if (record.dbName === dbName && record.email === email && record.mailKey === mailKey && Date.now() - record.time < 5 * 60 * 1000) {
        // mailKey 相同，短时间内不再发送重复邮件
        return;
      }
      if (record.dbName === dbName) recentSendMailCountPeerDB++;
      if (record.email === email) recentSendMailCountPeerEmail++;
    }
    if (recentSendMailCountPeerDB >= recentSendMailCountPeerDBLimit) {
      throw new Error('当前站点发送邮件频率过快，请稍后再试');
    }
    if (recentSendMailCountPeerEmail >= recentSendMailCountPeerEmailLimit) {
      throw new Error('向该地址发送邮件频率过快，请稍后再试');
    }

    await sendMail(
      db,
      email,
      `${title} - ${(await getSettingValue(db, 'site_name')) || getDBNameFromDB(db)}`,
      `${htmlBody}<br/><br/>
<p style="font-size: 12px; opacity: 0.5">如果您不想再收到此类邮件，可以<a href="http://${await getDefaultHost(
        dbName,
      )}/#/personal-center">点击退订</a></p>
${
  (await getDefaultHost(dbName)).includes('localhost')
    ? '<br /><p style="color: red">邮件链接地址异常：未绑定论坛域名，请在论坛后台设置</p>'
    : ''
}
`,
    );

    recentSendMailRecords.set(sendMailRecordIdNext++, {
      dbName,
      mailKey,
      email,
      time: Date.now(),
    });

    getLogger(`mail-records.log`).logWithDBAndUser(
      {
        title,
        email,
        mailKey,
        suc: 1,
      },
      db,
      mailToUser,
    );
  } catch (e: any) {
    console.error(e);
    getLogger(`mail-records.log`).logWithDBAndUser(
      {
        title,
        email,
        mailKey,
        suc: 0,
        error: e.message || String(e),
      },
      db,
      mailToUser,
    );
    throw e;
  }
}
