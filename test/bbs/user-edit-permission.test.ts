import { getTestDomainPrefix, initJestWithDomain, testFetchJSON } from '../test-utils';
import { HEADER_TOKEN } from '../../server/routes/bbs/const';

const testDomain = getTestDomainPrefix(__filename);
const defaultHeaders = {};
initJestWithDomain(testDomain);

test('edit user check permission', async () => {
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

  // 修改成功: 有修改自己账号的权限
  expect(
    (
      await testFetchJSON(testDomain, `bbs/users/${user1.id}`, {
        method: 'post',
        headers: { 'Content-Type': 'application/json', ...user1Headers },
        body: JSON.stringify({ nickname: 'user1_modified' }),
      })
    ).success,
  ).toBeTruthy();
  expect((await testFetchJSON(testDomain, `bbs/users/${user1.id}`, { headers: defaultHeaders })).data?.nickname).toBe('user1_modified');

  // 修改失败：无权限修改他人账号
  const adminNickName = (await testFetchJSON(testDomain, 'bbs/users/1', { headers: defaultHeaders })).data?.nickname;
  await expect(() =>
    testFetchJSON(testDomain, 'bbs/users/1', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...user1Headers },
      body: JSON.stringify({ nickname: '管理员_modified2' }),
    }),
  ).rejects.toThrowError(/Error/);
  expect((await testFetchJSON(testDomain, 'bbs/users/1', { headers: defaultHeaders })).data?.nickname).toBe(adminNickName);

  // 赋权
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

  // 赋权后再次修改：成功
  expect(
    (
      await testFetchJSON(testDomain, 'bbs/users/1', {
        method: 'post',
        headers: { 'Content-Type': 'application/json', [HEADER_TOKEN]: user1Token, ...defaultHeaders },
        body: JSON.stringify({ nickname: '管理员_modified2' }),
      })
    ).success,
  ).toBeTruthy();
  expect((await testFetchJSON(testDomain, 'bbs/users/1', { headers: defaultHeaders })).data?.nickname).toBe('管理员_modified2');
});
