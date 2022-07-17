import { getTestDomainPrefix, initJestWithDomain, testFetchJSON } from '../test-utils';
import { HEADER_TOKEN } from '../../server/routes/bbs/const';

const testDomain = getTestDomainPrefix(__filename);
const defaultHeaders = {};
initJestWithDomain(testDomain);

let userAdmin;
beforeAll(async () => {
  await Promise.all([
    testFetchJSON(testDomain, 'bbs/login', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders },
      body: JSON.stringify({ username: 'admin', password: '123123', captcha_id: '1', captcha_text: '1234' }),
    }).then((resp) => (userAdmin = resp.data)),
  ]);
});

test('user-approved', async () => {
  const createdUser1 = (
    await testFetchJSON(testDomain, 'bbs/register', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders },
      body: JSON.stringify({ username: 'user1', password: '123123', captcha_id: '1', captcha_text: '1234' }),
    })
  ).data;
  expect(createdUser1.status).toBe(0); // 用户状态正常

  // 设置注册需要审核
  await testFetchJSON(testDomain, 'bbs/setting/set', {
    method: 'post',
    headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: userAdmin.token },
    body: JSON.stringify({ key: 'register_validate', value: '1' }),
  });

  const createdUser2 = (
    await testFetchJSON(testDomain, 'bbs/register', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders },
      body: JSON.stringify({ username: 'user2', password: '123123', captcha_id: '1', captcha_text: '1234' }),
    })
  ).data;
  expect(createdUser2.status).toBe(2);

  const createdUser3 = (
    await testFetchJSON(testDomain, 'bbs/register', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders },
      body: JSON.stringify({ username: 'user3', password: '123123', captcha_id: '1', captcha_text: '1234' }),
    })
  ).data;
  expect(createdUser3.status).toBe(2);

  let checkingUserList = (
    await testFetchJSON(testDomain, 'bbs/users/list?status=2', {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: createdUser1.token },
    })
  ).data;
  expect(checkingUserList.length).toBe(2);
  expect(checkingUserList[0].id).toBe(createdUser2.id);
  expect(checkingUserList[1].id).toBe(createdUser3.id);

  // user1 操作审核通过：无权限
  await expect(() =>
    testFetchJSON(testDomain, `bbs/users/${createdUser2.id}`, {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: createdUser1.token },
      body: JSON.stringify({ status: 0 }),
    }),
  ).rejects.toThrowError(/Error/);

  // 审核通过
  await testFetchJSON(testDomain, `bbs/users/${createdUser2.id}`, {
    method: 'post',
    headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: userAdmin.token },
    body: JSON.stringify({ status: 0 }),
  });

  checkingUserList = (
    await testFetchJSON(testDomain, 'bbs/users/list?status=2', {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: createdUser1.token },
    })
  ).data;
  expect(checkingUserList.length).toBe(1);
  expect(checkingUserList[0].id).toBe(createdUser3.id);

  // 审核失败 user3
  await testFetchJSON(testDomain, `bbs/users/${createdUser3.id}`, {
    method: 'post',
    headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: userAdmin.token },
    body: JSON.stringify({ status: 3, reject_reason: 'reject_reason1' }),
  });

  checkingUserList = (
    await testFetchJSON(testDomain, 'bbs/users/list?status=2', {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: createdUser1.token },
    })
  ).data;
  expect(checkingUserList.length).toBe(0);

  const checkFailUserList = (
    await testFetchJSON(testDomain, 'bbs/users/list?status=3', {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: createdUser1.token },
    })
  ).data;
  expect(checkFailUserList.length).toBe(1);
  expect(checkFailUserList[0].status).toBe(3);
  expect(checkFailUserList[0].reject_reason).toBe('reject_reason1');
});
