import { getTestDomainPrefix, initJestWithDomain, testFetchJSON } from '../test-utils';
import { HEADER_TOKEN } from '../../server/routes/bbs/const';

const testDomain = getTestDomainPrefix(__filename);
const defaultHeaders = {};
initJestWithDomain(testDomain);

test('default group', async () => {
  const adminToken = (
    await testFetchJSON(testDomain, 'bbs/login', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders },
      body: JSON.stringify({ username: 'admin', password: '123123', captcha_id: '1', captcha_text: '1234' }),
    })
  ).data.token;
  const adminHeaders = { ...defaultHeaders, [HEADER_TOKEN]: adminToken };

  let myGroup1 = (
    await testFetchJSON(testDomain, 'bbs/group/addGroup', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...adminHeaders },
      body: JSON.stringify({ group_name: 'MyDefaultGroupName' }),
    })
  ).data;
  let myGroup2 = (
    await testFetchJSON(testDomain, 'bbs/group/addGroup', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...adminHeaders },
      body: JSON.stringify({ group_name: 'MyDefaultGroupName2' }),
    })
  ).data;
  expect(myGroup1).toBeTruthy();
  expect(myGroup2).toBeTruthy();
  expect(myGroup1.default).toBeFalsy();
  expect(myGroup2.default).toBeFalsy();

  // 设置 group1 为默认 group
  expect(
    (
      await testFetchJSON(testDomain, 'bbs/group/setGroup', {
        method: 'post',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({ group_id: myGroup1.id, group_default: true }),
      })
    ).success,
  ).toBeTruthy();
  let allGroups = (
    await testFetchJSON(testDomain, 'bbs/group/listGroup', {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...adminHeaders },
    })
  ).data;
  expect(allGroups.find((g) => g.default).id).toBe(myGroup1.id);

  // 创建用户，用户的 group 为 myGroup1
  const newUser1 = (
    await testFetchJSON(testDomain, 'bbs/register', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders },
      body: JSON.stringify({ username: 'user1', password: '123123', captcha_id: '1', captcha_text: '1234' }),
    })
  ).data;
  expect((await testFetchJSON(testDomain, `bbs/users/getUserGroup?user_id=${newUser1.id}`, { headers: defaultHeaders })).data.id).toBe(
    myGroup1.id,
  );

  // 设置 group2 为默认 group
  expect(
    (
      await testFetchJSON(testDomain, 'bbs/group/setGroup', {
        method: 'post',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({ group_id: myGroup2.id, group_default: true }),
      })
    ).success,
  ).toBeTruthy();
  allGroups = (
    await testFetchJSON(testDomain, 'bbs/group/listGroup', {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...adminHeaders },
    })
  ).data;
  expect(allGroups.find((g) => g.default).id).toBe(myGroup2.id);

  // 创建用户，用户的 group 为 myGroup2
  const newUser2 = (
    await testFetchJSON(testDomain, 'bbs/register', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders },
      body: JSON.stringify({ username: 'user2', password: '123123', captcha_id: '1', captcha_text: '1234' }),
    })
  ).data;
  expect((await testFetchJSON(testDomain, `bbs/users/getUserGroup?user_id=${newUser2.id}`, { headers: defaultHeaders })).data.id).toBe(
    myGroup2.id,
  );
  expect((await testFetchJSON(testDomain, `bbs/users/getUserGroup?user_id=${newUser1.id}`, { headers: defaultHeaders })).data.id).toBe(
    myGroup1.id,
  ); // 用户1的 group 不变

  // 不能删除默认分组
  await expect(() =>
    testFetchJSON(testDomain, 'bbs/group/removeGroup', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...adminHeaders },
      body: JSON.stringify({ group_id: myGroup2.id }),
    }),
  ).rejects.toThrowError(/Error/);
});
