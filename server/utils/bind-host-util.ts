import { getDB } from '../models/db';
import { getSettingValue, setSettingValue } from '../models/Settings';

export async function getBindHosts(dbName: string): Promise<string[]> {
  const db = await getDB(dbName);
  return ((await getSettingValue(db, '__internal_bind_hosts')) || '').split(',').filter(Boolean);
}

export async function getDefaultHost(dbName: string): Promise<string> {
  return (await getBindHosts(dbName))[0] || `localhost:${process.env.PORT || '884'}`;
}

export async function setBindHosts(dbName: string, bindHosts: string[]) {
  const db = await getDB(dbName);
  await setSettingValue(db, { __internal_bind_hosts: (bindHosts || []).join(',') });
}
