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

test('thread-crud', async () => {
  const createdThread = (
    await testFetchJSON(testDomain, 'bbs/threads/create', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: userAdmin.token },
      body: JSON.stringify({ title: '测试发帖1', content: '测试发帖内容内容内容', category_id: 1 }),
    })
  ).data;
  expect(createdThread?.id).toBeTruthy();
  expect(createdThread?.user_id).toBe(userAdmin.id);
  expect(createdThread?.category_id).toBe(1);
  expect(createdThread?.title).toBe('测试发帖1');
  expect(createdThread?.content).toBe('测试发帖内容内容内容');

  let getCreatedThread = (
    await testFetchJSON(testDomain, `bbs/threads/${createdThread.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: userAdmin.token },
    })
  ).data;
  expect(getCreatedThread.id).toBeTruthy();
  expect(getCreatedThread.user_id).toBe(userAdmin.id);
  expect(getCreatedThread.category_id).toBe(1);
  expect(getCreatedThread.title).toBe('测试发帖1');
  expect(getCreatedThread.content).toBe('测试发帖内容内容内容');

  const modifyResp = await testFetchJSON(testDomain, `bbs/threads/${createdThread.id}`, {
    method: 'post',
    headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: userAdmin.token },
    body: JSON.stringify({ title: '测试发帖1_modify', content: '测试发帖内容内容内容_modify', category_id: 1 }),
  });
  expect(modifyResp.success).toBeTruthy();

  getCreatedThread = (
    await testFetchJSON(testDomain, `bbs/threads/${createdThread.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: userAdmin.token },
    })
  ).data;
  expect(getCreatedThread.id).toBeTruthy();
  expect(getCreatedThread.user_id).toBe(userAdmin.id);
  expect(getCreatedThread.category_id).toBe(1);
  expect(getCreatedThread.title).toBe('测试发帖1_modify');
  expect(getCreatedThread.content).toBe('测试发帖内容内容内容_modify');

  let threadList = (
    await testFetchJSON(testDomain, 'bbs/threads/list', {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: userAdmin.token },
    })
  ).data;
  expect(threadList.length).toBe(1);
  expect(threadList[0].id).toBe(createdThread.id);

  const createdThread2 = (
    await testFetchJSON(testDomain, 'bbs/threads/create', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: userAdmin.token },
      body: JSON.stringify({ title: '测试发帖2', content: '测试发帖内容内容内容', category_id: 1 }),
    })
  ).data;

  threadList = (
    await testFetchJSON(testDomain, 'bbs/threads/list', {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: userAdmin.token },
    })
  ).data;
  expect(threadList.length).toBe(2);
  expect(threadList[0].id).toBe(createdThread2.id);
  expect(threadList[1].id).toBe(createdThread.id);

  const deleteResp = await testFetchJSON(testDomain, `bbs/threads/${createdThread.id}`, {
    method: 'delete',
    headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: userAdmin.token },
    body: JSON.stringify({ title: '测试发帖1_modify', content: '测试发帖内容内容内容_modify', category_id: 1 }),
  });
  expect(deleteResp.success).toBeTruthy();

  threadList = (
    await testFetchJSON(testDomain, 'bbs/threads/list', {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: userAdmin.token },
    })
  ).data;
  expect(threadList.length).toBe(1);
  expect(threadList[0].id).toBe(createdThread2.id);

  const thread1Resp = await testFetchJSON(testDomain, `bbs/threads/${createdThread.id}`, {
    method: 'get',
    headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: userAdmin.token },
  });
  expect(thread1Resp.data.deleted_at).toBeTruthy();
});
