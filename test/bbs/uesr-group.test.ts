import { getTestDomainPrefix, initJestWithDomain, testFetchJSON } from '../test-utils';
import { HEADER_TOKEN } from '../../server/routes/bbs/const';

const testDomain = getTestDomainPrefix(__filename);
const defaultHeaders = {};
initJestWithDomain(testDomain);

test('user-group', async () => {
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

  const originUserGroup = (await testFetchJSON(testDomain, `bbs/users/getUserGroup?user_id=${user1.id}`, { headers: defaultHeaders })).data;

  const createGroup = (
    await testFetchJSON(testDomain, 'bbs/group/addGroup', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...adminHeaders },
      body: JSON.stringify({ group_name: 'MyGroupName' }),
    })
  ).data;
  expect(createGroup).toBeTruthy();
  expect(createGroup.id).not.toBe(originUserGroup.id);

  expect(
    (
      await testFetchJSON(testDomain, 'bbs/users/setUserGroup', {
        method: 'post',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({ user_id: user1.id, group_id: createGroup.id }),
      })
    ).success,
  ).toBeTruthy();

  expect((await testFetchJSON(testDomain, `bbs/users/getUserGroup?user_id=${user1.id}`, { headers: defaultHeaders })).data.id).toBe(
    createGroup.id,
  );

  expect(
    (
      await testFetchJSON(testDomain, 'bbs/users/setUserGroup', {
        method: 'post',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({ user_id: user1.id, group_id: originUserGroup.id }),
      })
    ).success,
  ).toBeTruthy();

  expect((await testFetchJSON(testDomain, `bbs/users/getUserGroup?user_id=${user1.id}`, { headers: defaultHeaders })).data.id).toBe(
    originUserGroup.id,
  );
});
