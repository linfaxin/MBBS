import fetchApi from '@/api/base/fetch';

/**
 * 用户消息
 */
export interface Message {
  /** 消息 id */
  id: number;
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
  /** 邮件触发结果 */
  send_mail_result?: 'suc' | string;
  /** 未读消息合并 key */
  unread_merge_key: string;
  /** 创建时间 */
  created_at: string;
  /** 更新时间 */
  updated_at?: string;
  /** 消息已读时间 */
  read_at?: string;
}

export function listMessage(params: { page_offset: number; page_limit: number }) {
  return fetchApi({
    pathOrUrl: 'message/listMessage',
    method: 'get',
    data: params,
  }).then((resp) => ({
    list: resp.data as Message[],
    totalCount: resp.extra.totalCount as number,
    unreadCount: resp.extra.unreadCount as number,
  }));
}

let getUnreadMessageCountPromise: Promise<number> | undefined;
export function getUnreadMessageCount() {
  if (!getUnreadMessageCountPromise) {
    getUnreadMessageCountPromise = fetchApi({
      pathOrUrl: 'message/unreadMessageCount',
      method: 'get',
    })
      .then((resp) => {
        getUnreadMessageCountPromise = undefined;
        return resp.data as number;
      })
      .catch((e) => {
        getUnreadMessageCountPromise = undefined;
        throw e;
      });
  }
  return getUnreadMessageCountPromise;
}

export function readMessage(msgId: number): Promise<Message> {
  return fetchApi({
    pathOrUrl: 'message/readMessage',
    method: 'get',
    data: {
      msg_id: msgId,
    },
  }).then((resp) => resp.data);
}

export async function readAllMessage(): Promise<void> {
  await fetchApi({
    pathOrUrl: 'message/readAllMessage',
    method: 'post',
  });
}

export async function removeMessage(msgId: number): Promise<void> {
  await fetchApi({
    pathOrUrl: 'message/removeMessage',
    method: 'post',
    data: {
      msg_id: msgId,
    },
  });
}

export async function removeAllMessage(): Promise<void> {
  await fetchApi({
    pathOrUrl: 'message/removeAllMessage',
    method: 'post',
  });
}
