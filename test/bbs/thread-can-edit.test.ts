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

test('thread-can-edit', async () => {
  const createdThread1 = (
    await testFetchJSON(testDomain, 'bbs/threads/create', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
      body: JSON.stringify({ title: '测试发帖1', content: '测试发帖内容内容内容', category_id: 1 }),
    })
  ).data;

  let user1GetThread1 = (
    await testFetchJSON(testDomain, `bbs/threads/${createdThread1.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    })
  ).data;
  expect(user1GetThread1.can_edit).toBeTruthy();
  expect(user1GetThread1.can_hide).toBeTruthy();

  let user2GetThread1 = (
    await testFetchJSON(testDomain, `bbs/threads/${createdThread1.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user2.token },
    })
  ).data;
  expect(user2GetThread1.can_edit).toBeFalsy();
  expect(user2GetThread1.can_hide).toBeFalsy();

  await testFetchJSON(testDomain, 'bbs/permissions/removePermission', {
    method: 'post',
    headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: userAdmin.token },
    body: JSON.stringify({ group_id: GROUP_ID_DEFAULT, permission: 'thread.hideOwnThread' }),
  });
  user1GetThread1 = (
    await testFetchJSON(testDomain, `bbs/threads/${createdThread1.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    })
  ).data;
  expect(user1GetThread1.can_edit).toBeTruthy();
  expect(user1GetThread1.can_hide).toBeFalsy();

  await testFetchJSON(testDomain, 'bbs/permissions/removePermission', {
    method: 'post',
    headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: userAdmin.token },
    body: JSON.stringify({ group_id: GROUP_ID_DEFAULT, permission: 'thread.editOwnThread' }),
  });
  user1GetThread1 = (
    await testFetchJSON(testDomain, `bbs/threads/${createdThread1.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    })
  ).data;
  expect(user1GetThread1.can_edit).toBeFalsy();
  expect(user1GetThread1.can_hide).toBeFalsy();

  await testFetchJSON(testDomain, 'bbs/permissions/addPermission', {
    method: 'post',
    headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: userAdmin.token },
    body: JSON.stringify({ group_id: GROUP_ID_DEFAULT, permission: 'thread.edit' }),
  });
  await testFetchJSON(testDomain, 'bbs/permissions/addPermission', {
    method: 'post',
    headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: userAdmin.token },
    body: JSON.stringify({ group_id: GROUP_ID_DEFAULT, permission: 'thread.hide' }),
  });

  user1GetThread1 = (
    await testFetchJSON(testDomain, `bbs/threads/${createdThread1.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    })
  ).data;
  expect(user1GetThread1.can_edit).toBeTruthy();
  expect(user1GetThread1.can_hide).toBeTruthy();

  user2GetThread1 = (
    await testFetchJSON(testDomain, `bbs/threads/${createdThread1.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user2.token },
    })
  ).data;
  expect(user2GetThread1.can_edit).toBeTruthy();
  expect(user2GetThread1.can_hide).toBeTruthy();
});
