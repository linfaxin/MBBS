import { getTestDomainPrefix, initJestWithDomain, testFetchJSON } from '../test-utils';
import { HEADER_TOKEN } from '../../server/routes/bbs/const';

const testDomain = getTestDomainPrefix(__filename);
const defaultHeaders = {};
initJestWithDomain(testDomain);

let userAdmin;
let user1;
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
  ]);
});

test('thread-approved', async () => {
  const createdThread1 = (
    await testFetchJSON(testDomain, 'bbs/threads/create', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
      body: JSON.stringify({ title: '测试发帖1', content: '测试发帖内容内容内容', category_id: 1 }),
    })
  ).data;
  expect(createdThread1.is_approved).toBe(1);

  // 设置发帖需要审核
  await testFetchJSON(testDomain, 'bbs/setting/set', {
    method: 'post',
    headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: userAdmin.token },
    body: JSON.stringify({ key: 'create_thread_validate', value: '1' }),
  });

  // 发布两个帖子等待审核
  const createdThread2 = (
    await testFetchJSON(testDomain, 'bbs/threads/create', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
      body: JSON.stringify({ title: '测试发帖2', content: '测试发帖内容内容内容', category_id: 1 }),
    })
  ).data;
  expect(createdThread2.is_approved).toBe(0);

  const createdThread3 = (
    await testFetchJSON(testDomain, 'bbs/threads/create', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
      body: JSON.stringify({ title: '测试发帖3', content: '测试发帖内容内容内容', category_id: 1 }),
    })
  ).data;
  expect(createdThread3.is_approved).toBe(0);

  // 列表里不会出现审核中的帖子
  let threadList = (
    await testFetchJSON(testDomain, 'bbs/threads/list', {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    })
  ).data;
  expect(threadList.length).toBe(1);
  expect(threadList[0].id).toBe(createdThread1.id);

  // 发帖用户自己访问 自己的审核中帖子 返回 审核中 状态码
  let userGetThread1 = (
    await testFetchJSON(testDomain, `bbs/threads/${createdThread1.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    })
  ).data;
  expect(userGetThread1.is_approved).toBe(1);

  // 游客/其他用户 访问审核中帖子 返回错误
  await expect(() =>
    testFetchJSON(testDomain, `bbs/threads/${createdThread2.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders },
    }),
  ).rejects.toThrowError(/Error/);

  await expect(() =>
    testFetchJSON(testDomain, `bbs/threads/${createdThread3.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders },
    }),
  ).rejects.toThrowError(/Error/);

  // user1 操作审核通过：返回 无权限 错误
  await expect(() =>
    testFetchJSON(testDomain, 'bbs/threads/setApproved', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
      body: JSON.stringify({ thread_id: createdThread1.id, is_approved: 1 }),
    }),
  ).rejects.toThrowError(/Error/);

  // 审核通过
  await testFetchJSON(testDomain, 'bbs/threads/setApproved', {
    method: 'post',
    headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: userAdmin.token },
    body: JSON.stringify({ thread_id: createdThread2.id, is_approved: 1 }),
  });
  // 审核失败 thread3
  await testFetchJSON(testDomain, 'bbs/threads/setApproved', {
    method: 'post',
    headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: userAdmin.token },
    body: JSON.stringify({ thread_id: createdThread3.id, is_approved: 2 }),
  });

  const userGetThread2 = (
    await testFetchJSON(testDomain, `bbs/threads/${createdThread2.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    })
  ).data;
  expect(userGetThread2.is_approved).toBe(1);

  // 访问审核失败的帖子报错
  await expect(() =>
    testFetchJSON(testDomain, `bbs/threads/${createdThread3.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders },
    }),
  ).rejects.toThrowError(/Error/);

  // 帖子列表里出现审核通过的帖子
  threadList = (
    await testFetchJSON(testDomain, 'bbs/threads/list', {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    })
  ).data;
  expect(threadList.length).toBe(2);
  expect(threadList[0].id).toBe(createdThread2.id);
  expect(threadList[1].id).toBe(createdThread1.id);

  // 设置发帖不需要审核
  await testFetchJSON(testDomain, 'bbs/setting/set', {
    method: 'post',
    headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: userAdmin.token },
    body: JSON.stringify({ key: 'create_thread_validate', value: '0' }),
  });

  // 新发布的帖子审核状态码为1（正常）
  const createdThread4 = (
    await testFetchJSON(testDomain, 'bbs/threads/create', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
      body: JSON.stringify({ title: '测试发帖4', content: '测试发帖内容内容内容', category_id: 1 }),
    })
  ).data;
  expect(createdThread4.is_approved).toBe(1);

  // 帖子列表里出现新发布的帖子
  threadList = (
    await testFetchJSON(testDomain, 'bbs/threads/list', {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    })
  ).data;
  expect(threadList.length).toBe(3);
  expect(threadList[0].id).toBe(createdThread4.id);
});
