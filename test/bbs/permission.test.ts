import { getTestDomainPrefix, initJestWithDomain, testFetchJSON } from '../test-utils';
import { HEADER_TOKEN } from '../../server/routes/bbs/const';

const testDomain = getTestDomainPrefix(__filename);
const defaultHeaders = {};
initJestWithDomain(testDomain);

test('permission-curd', async () => {
  const adminToken = (
    await testFetchJSON(testDomain, 'bbs/login', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders },
      body: JSON.stringify({ username: 'admin', password: '123123', captcha_id: '1', captcha_text: '1234' }),
    })
  ).data.token;
  const adminHeaders = { ...defaultHeaders, [HEADER_TOKEN]: adminToken };

  // 注册成功，拿到 token
  const resp = await testFetchJSON(testDomain, 'bbs/register', {
    method: 'post',
    headers: { 'Content-Type': 'application/json', ...defaultHeaders },
    body: JSON.stringify({ username: 'user1', password: '123123', captcha_id: '1', captcha_text: '1234' }),
  });
  const user1 = resp?.data;
  const user1Token = resp?.data?.token;
  expect(user1Token).toBeTruthy();
  const user1Headers = { ...defaultHeaders, [HEADER_TOKEN]: user1Token };

  // 赋权
  expect(
    (await testFetchJSON(testDomain, `bbs/permissions/getMyPermissions`, { headers: user1Headers })).data.includes('user.edit.base'),
  ).toBeFalsy();

  const user1Group = (await testFetchJSON(testDomain, `bbs/users/getUserGroup?user_id=${user1.id}`, { headers: defaultHeaders })).data;

  expect(
    (
      await testFetchJSON(testDomain, 'bbs/permissions/addPermission', {
        method: 'post',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({ group_id: user1Group.id, permission: 'user.edit.base' }),
      })
    ).success,
  ).toBeTruthy();

  expect(
    (await testFetchJSON(testDomain, `bbs/permissions/getMyPermissions`, { headers: user1Headers })).data.includes('user.edit.base'),
  ).toBeTruthy();

  expect(
    (
      await testFetchJSON(testDomain, 'bbs/permissions/setPermissions', {
        method: 'post',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({ group_id: user1Group.id, permissions: ['user.edit.group', 'user.edit.status'] }),
      })
    ).success,
  ).toBeTruthy();

  let myPermissions = (await testFetchJSON(testDomain, `bbs/permissions/getMyPermissions`, { headers: user1Headers })).data;
  expect(myPermissions.includes('user.edit.base')).toBeFalsy();
  expect(myPermissions).toEqual(['user.edit.group', 'user.edit.status']);

  expect(
    (
      await testFetchJSON(testDomain, 'bbs/permissions/removePermission', {
        method: 'post',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({ group_id: user1Group.id, permission: 'user.edit.status' }),
      })
    ).success,
  ).toBeTruthy();

  myPermissions = (await testFetchJSON(testDomain, `bbs/permissions/getMyPermissions`, { headers: user1Headers })).data;
  expect(myPermissions.includes('user.edit.status')).toBeFalsy();
  expect(myPermissions).toEqual(['user.edit.group']);
});
