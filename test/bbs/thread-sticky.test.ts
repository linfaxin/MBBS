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

test('thread-sticky', async () => {
  const createdThread1 = (
    await testFetchJSON(testDomain, 'bbs/threads/create', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: userAdmin.token },
      body: JSON.stringify({ title: '测试发帖1', content: '测试发帖内容内容内容', category_id: 1 }),
    })
  ).data;
  const createdThread2 = (
    await testFetchJSON(testDomain, 'bbs/threads/create', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: userAdmin.token },
      body: JSON.stringify({ title: '测试发帖2', content: '测试发帖内容内容内容', category_id: 1 }),
    })
  ).data;

  let threadList = (
    await testFetchJSON(testDomain, 'bbs/threads/list', {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    })
  ).data;
  expect(threadList.length).toBe(2);
  expect(threadList[1].id).toBe(createdThread1.id);
  expect(threadList[0].id).toBe(createdThread2.id);

  let userGetThread1 = (
    await testFetchJSON(testDomain, `bbs/threads/${createdThread1.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    })
  ).data;
  expect(userGetThread1.is_sticky).toBeFalsy();
  let userGetThread2 = (
    await testFetchJSON(testDomain, `bbs/threads/${createdThread2.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    })
  ).data;
  expect(userGetThread2.is_sticky).toBeFalsy();

  // user1 操作置顶：无权限
  await expect(() =>
    testFetchJSON(testDomain, 'bbs/threads/setSticky', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
      body: JSON.stringify({ thread_id: createdThread1.id, is_sticky: true }),
    }),
  ).rejects.toThrowError(/Error/);

  // 置顶 thread1
  await testFetchJSON(testDomain, 'bbs/threads/setSticky', {
    method: 'post',
    headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: userAdmin.token },
    body: JSON.stringify({ thread_id: createdThread1.id, is_sticky: true }),
  });

  userGetThread1 = (
    await testFetchJSON(testDomain, `bbs/threads/${createdThread1.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    })
  ).data;
  expect(userGetThread1.is_sticky).toBeTruthy();

  threadList = (
    await testFetchJSON(testDomain, 'bbs/threads/list', {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    })
  ).data;
  expect(threadList.length).toBe(2);
  expect(threadList[0].is_sticky).toBeTruthy();
  expect(threadList[1].is_sticky).toBeFalsy();
  expect(threadList[0].id).toBe(createdThread1.id);
  expect(threadList[1].id).toBe(createdThread2.id);

  // 取消置顶 thread1
  await testFetchJSON(testDomain, 'bbs/threads/setSticky', {
    method: 'post',
    headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: userAdmin.token },
    body: JSON.stringify({ thread_id: createdThread1.id, is_sticky: false }),
  });

  userGetThread1 = (
    await testFetchJSON(testDomain, `bbs/threads/${createdThread1.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    })
  ).data;
  expect(userGetThread1.is_sticky).toBeFalsy();
});
