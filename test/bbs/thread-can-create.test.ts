import { getTestDomainPrefix, initJestWithDomain, testFetchJSON } from '../test-utils';
import { GROUP_ID_DEFAULT, HEADER_TOKEN } from '../../server/routes/bbs/const';

const testDomain = getTestDomainPrefix(__filename);
const defaultHeaders = {};
initJestWithDomain(testDomain);

let userAdmin;
let user1;
let user2;
beforeAll(async () => {
  await Promise.all([
    testFetchJSON(testDomain, 'bbs/login', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders },
      body: JSON.stringify({ username: 'admin', password: '123123', captcha_id: '1', captcha_text: '1234' }),
    }).then((resp) => (userAdmin = resp.data)),
    testFetchJSON(testDomain, 'bbs/register', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders },
      body: JSON.stringify({ username: 'user1', password: '123123', captcha_id: '1', captcha_text: '1234' }),
    }).then((resp) => (user1 = resp.data)),
    testFetchJSON(testDomain, 'bbs/register', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders },
      body: JSON.stringify({ username: 'user2', password: '123123', captcha_id: '1', captcha_text: '1234' }),
    }).then((resp) => (user2 = resp.data)),
  ]);
});

test('thread-can-create', async () => {
  await testFetchJSON(testDomain, 'bbs/threads/create', {
    method: 'post',
    headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    body: JSON.stringify({ title: '测试发帖1', content: '测试发帖内容内容内容', category_id: 1 }),
  });

  // 移除创建权限
  await testFetchJSON(testDomain, 'bbs/permissions/removePermission', {
    method: 'post',
    headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: userAdmin.token },
    body: JSON.stringify({ group_id: GROUP_ID_DEFAULT, permission: 'createThread' }),
  });

  // 发帖失败
  await expect(() =>
    testFetchJSON(testDomain, 'bbs/threads/create', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
      body: JSON.stringify({ title: '测试发帖2', content: '测试发帖内容内容内容', category_id: 1 }),
    }),
  ).rejects.toThrowError(/Error/);

  // 添加创建权限
  await testFetchJSON(testDomain, 'bbs/permissions/addPermission', {
    method: 'post',
    headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: userAdmin.token },
    body: JSON.stringify({ group_id: GROUP_ID_DEFAULT, permission: 'createThread' }),
  });

  // 发帖成功
  await testFetchJSON(testDomain, 'bbs/threads/create', {
    method: 'post',
    headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    body: JSON.stringify({ title: '测试发帖2', content: '测试发帖内容内容内容', category_id: 1 }),
  });

  // 设置每日发帖上限：3
  await testFetchJSON(testDomain, 'bbs/setting/set', {
    method: 'post',
    headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: userAdmin.token },
    body: JSON.stringify({ key: 'person_daily_create_thread', value: '3' }),
  });

  // 发帖成功
  await testFetchJSON(testDomain, 'bbs/threads/create', {
    method: 'post',
    headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    body: JSON.stringify({ title: '测试发帖3', content: '测试发帖内容内容内容', category_id: 1 }),
  });

  // 发帖失败
  await expect(() =>
    testFetchJSON(testDomain, 'bbs/threads/create', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
      body: JSON.stringify({ title: '测试发帖4', content: '测试发帖内容内容内容', category_id: 1 }),
    }),
  ).rejects.toThrowError(/Error/);

  // 设置每日发帖上限：10
  await testFetchJSON(testDomain, 'bbs/setting/set', {
    method: 'post',
    headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: userAdmin.token },
    body: JSON.stringify({ key: 'person_daily_create_thread', value: '10' }),
  });

  // 发帖成功
  await testFetchJSON(testDomain, 'bbs/threads/create', {
    method: 'post',
    headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    body: JSON.stringify({ title: '测试发帖4', content: '测试发帖内容内容内容', category_id: 1 }),
  });

  // 设置每日单分类发帖上限：5
  await testFetchJSON(testDomain, 'bbs/setting/set', {
    method: 'post',
    headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: userAdmin.token },
    body: JSON.stringify({ key: 'person_daily_create_thread_category', value: '5' }),
  });

  // 发帖成功
  await testFetchJSON(testDomain, 'bbs/threads/create', {
    method: 'post',
    headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    body: JSON.stringify({ title: '测试发帖5', content: '测试发帖内容内容内容', category_id: 1 }),
  });

  // 发帖失败
  await expect(() =>
    testFetchJSON(testDomain, 'bbs/threads/create', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
      body: JSON.stringify({ title: '测试发帖6', content: '测试发帖内容内容内容', category_id: 1 }),
    }),
  ).rejects.toThrowError(/Error/);

  // 设置每日单分类发帖上限：10
  await testFetchJSON(testDomain, 'bbs/setting/set', {
    method: 'post',
    headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: userAdmin.token },
    body: JSON.stringify({ key: 'person_daily_create_thread_category', value: '10' }),
  });

  // 发帖成功
  await testFetchJSON(testDomain, 'bbs/threads/create', {
    method: 'post',
    headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    body: JSON.stringify({ title: '测试发帖6', content: '测试发帖内容内容内容', category_id: 1 }),
  });
});
