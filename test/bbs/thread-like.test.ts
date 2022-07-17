import { getTestDomainPrefix, initJestWithDomain, testFetchJSON } from '../test-utils';
import { HEADER_TOKEN } from '../../server/routes/bbs/const';

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

test('thread-like', async () => {
  const createdThread = (
    await testFetchJSON(testDomain, 'bbs/threads/create', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: userAdmin.token },
      body: JSON.stringify({ title: '测试发帖', content: '测试发帖内容内容内容', category_id: 1 }),
    })
  ).data;

  let user1GetThread = (
    await testFetchJSON(testDomain, `bbs/threads/${createdThread.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    })
  ).data;
  expect(user1GetThread.is_liked).toBeFalsy();
  expect(user1GetThread.like_count).toBe(0);

  // user1 点赞
  await testFetchJSON(testDomain, 'bbs/threads/setLike', {
    method: 'post',
    headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    body: JSON.stringify({ thread_id: createdThread.id, is_like: true }),
  });

  user1GetThread = (
    await testFetchJSON(testDomain, `bbs/threads/${createdThread.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    })
  ).data;
  expect(user1GetThread.is_liked).toBeTruthy();
  expect(user1GetThread.like_count).toBe(1);

  let user2GetThread = (
    await testFetchJSON(testDomain, `bbs/threads/${createdThread.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user2.token },
    })
  ).data;
  expect(user2GetThread.is_liked).toBeFalsy();
  expect(user2GetThread.like_count).toBe(1);

  // user2 点赞
  await testFetchJSON(testDomain, 'bbs/threads/setLike', {
    method: 'post',
    headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user2.token },
    body: JSON.stringify({ thread_id: createdThread.id, is_like: true }),
  });

  user2GetThread = (
    await testFetchJSON(testDomain, `bbs/threads/${createdThread.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user2.token },
    })
  ).data;
  expect(user2GetThread.is_liked).toBeTruthy();
  expect(user2GetThread.like_count).toBe(2);

  // user1 取消点赞
  await testFetchJSON(testDomain, 'bbs/threads/setLike', {
    method: 'post',
    headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    body: JSON.stringify({ thread_id: createdThread.id, is_like: false }),
  });

  user1GetThread = (
    await testFetchJSON(testDomain, `bbs/threads/${createdThread.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    })
  ).data;
  expect(user1GetThread.is_liked).toBeFalsy();
  expect(user1GetThread.like_count).toBe(1);

  user2GetThread = (
    await testFetchJSON(testDomain, `bbs/threads/${createdThread.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user2.token },
    })
  ).data;
  expect(user2GetThread.is_liked).toBeTruthy();
  expect(user2GetThread.like_count).toBe(1);
});
