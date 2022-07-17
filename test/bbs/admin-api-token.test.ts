import * as fs from 'fs';
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

test('admin api token', async () => {
  let adminApiToken = (
    await testFetchJSON(testDomain, 'bbs/manage/getAdminApiToken', {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: userAdmin.token },
    })
  ).data;

  expect(adminApiToken).toBeFalsy(); // 默认 api token 为空

  adminApiToken = (
    await testFetchJSON(testDomain, 'bbs/manage/resetAdminApiToken', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: userAdmin.token },
    })
  ).data;

  expect(adminApiToken).toBeTruthy();

  adminApiToken = (
    await testFetchJSON(testDomain, 'bbs/manage/getAdminApiToken', {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: userAdmin.token },
    })
  ).data;

  expect(adminApiToken).toBeTruthy();

  const loginUser = (
    await testFetchJSON(testDomain, 'bbs/users/getLoginUser', {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: adminApiToken },
    })
  ).data;

  expect(loginUser.username === userAdmin.username);

  // 再次重置
  await testFetchJSON(testDomain, 'bbs/manage/resetAdminApiToken', {
    method: 'post',
    headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: userAdmin.token },
  });

  // 原 admin token 失效
  await expect(
    testFetchJSON(testDomain, 'bbs/users/getLoginUser', {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: adminApiToken },
    }),
  ).rejects.toThrowError(/UnauthorizedError/);
});
