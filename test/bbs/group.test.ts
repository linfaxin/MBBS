import { getTestDomainPrefix, initJestWithDomain, testFetchJSON } from '../test-utils';
import { HEADER_TOKEN } from '../../server/routes/bbs/const';

const testDomain = getTestDomainPrefix(__filename);
const defaultHeaders = {};
initJestWithDomain(testDomain);

test('group-crud', async () => {
  const adminToken = (
    await testFetchJSON(testDomain, 'bbs/login', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders },
      body: JSON.stringify({ username: 'admin', password: '123123', captcha_id: '1', captcha_text: '1234' }),
    })
  ).data.token;
  const adminHeaders = { ...defaultHeaders, [HEADER_TOKEN]: adminToken };

  // create
  expect(
    (
      await testFetchJSON(testDomain, 'bbs/group/addGroup', {
        method: 'post',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({ group_name: 'MyGroupName' }),
      })
    ).success,
  ).toBeTruthy();
  expect(
    (
      await testFetchJSON(testDomain, 'bbs/group/addGroup', {
        method: 'post',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({ group_name: 'MyGroupName2' }),
      })
    ).success,
  ).toBeTruthy();

  // list
  let allGroups = (
    await testFetchJSON(testDomain, 'bbs/group/listGroup', {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...adminHeaders },
    })
  ).data;

  expect(allGroups.find((g) => g.name === 'MyGroupName')).toBeTruthy();
  expect(allGroups.find((g) => g.name === 'MyGroupName2')).toBeTruthy();

  // remove
  expect(
    (
      await testFetchJSON(testDomain, 'bbs/group/removeGroup', {
        method: 'post',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({ group_id: allGroups.find((g) => g.name === 'MyGroupName2').id }),
      })
    ).success,
  ).toBeTruthy();

  allGroups = (
    await testFetchJSON(testDomain, 'bbs/group/listGroup', {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...adminHeaders },
    })
  ).data;

  expect(allGroups.find((g) => g.name === 'MyGroupName')).toBeTruthy();
  expect(allGroups.find((g) => g.name === 'MyGroupName2')).toBeFalsy();

  // edit
  expect(
    (
      await testFetchJSON(testDomain, 'bbs/group/setGroup', {
        method: 'post',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({ group_id: allGroups.find((g) => g.name === 'MyGroupName').id, group_name: 'MyGroupName_edit' }),
      })
    ).success,
  ).toBeTruthy();

  allGroups = (
    await testFetchJSON(testDomain, 'bbs/group/listGroup', {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...adminHeaders },
    })
  ).data;
  expect(allGroups.find((g) => g.name === 'MyGroupName')).toBeFalsy();
  expect(allGroups.find((g) => g.name === 'MyGroupName_edit')).toBeTruthy();
});
