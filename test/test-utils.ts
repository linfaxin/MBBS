import fetch, { RequestInit, Response } from 'node-fetch';
import * as fs from 'fs';
import { exec, ChildProcess } from 'child_process';

const waitOn = require('wait-on');
const getPort = require('get-port');

const testDBDir = './test/db';

const domainMap = {} as Record<
  string,
  {
    port: number;
    process: ChildProcess;
  }
>;

export function initJestWithDomain(domain: string) {
  domain = domain.split('.')[0];
  jest.setTimeout(120000);
  beforeAll(async () => {
    await cleanDB(domain);

    const port = await getPort(); // 获取一个空闲端口号

    const childProcess = exec(
      `npx cross-env ENV=dev PORT=${port} MBBS_DB_DIR=${testDBDir} MBBS_DB_NAME=${domain} MBBS_SET_ADMIN_PASSWORD=123123 ts-node ./server/index`,
    );
    domainMap[domain] = { port, process: childProcess };

    await waitOn({ resources: [`http://localhost:${port}/bbsInfo`] });
  });
  afterAll(() => cleanDB(domain));
}

export async function testFetch(domain: string, urlPath: string, init?: RequestInit): Promise<Response> {
  const port = domainMap[domain]?.port;
  if (!port) throw new Error(`can't found bind port for domain: '${domain}'`);
  return fetch(`http://localhost:${port}/${urlPath}`, {
    ...init,
    redirect: 'manual',
  });
}

export async function testFetchJSON(domain: string, urlPath: string, init?: RequestInit): Promise<any> {
  const port = domainMap[domain]?.port;
  if (!port) throw new Error(`can't found bind port for domain: '${domain}'`);
  const response = await fetch(`http://localhost:${port}/${urlPath}`, {
    ...init,
    redirect: 'manual',
  });
  if (response.status >= 400) {
    throw new Error(`fetch fail(${response.status})\n  url: ${urlPath}\n  resp: ${await response.text()}`);
  }
  const json = await response.json();
  if (!json.success) {
    throw new Error(`fetch error(${json.name}): ${json.message}`);
  }
  return json;
}

export async function cleanDB(dbName: string) {
  if (fs.existsSync(`${testDBDir}/${dbName}.db`)) {
    fs.unlinkSync(`${testDBDir}/${dbName}.db`);
  }
  domainMap[dbName]?.process?.kill();
}

export function getTestDomainPrefix(fileName: string) {
  return `_test_${fileName
    .split('/')
    .pop()
    .replace(/\.test\.ts$/, '_tc')
    .replace(/\./g, '_')}`;
}
