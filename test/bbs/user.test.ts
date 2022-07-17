import { getTestDomainPrefix, initJestWithDomain, testFetchJSON } from '../test-utils';
import { HEADER_TOKEN } from '../../server/routes/bbs/const';

const testDomain = getTestDomainPrefix(__filename);
const dbName = testDomain.split('.')[0];
const defaultHeaders = {};
initJestWithDomain(testDomain);

test('get user', async () => {
  expect((await testFetchJSON(testDomain, 'bbs/users/1', { headers: defaultHeaders })).data?.username).toBe('admin');
  expect((await testFetchJSON(testDomain, `bbs/users/getByName?name=admin`, { headers: defaultHeaders })).data?.username).toBe('admin');
});

test('modify user', async () => {
  // 修改失败：未登录
  await expect(() =>
    testFetchJSON(testDomain, 'bbs/users/1', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders },
      body: JSON.stringify({ nickname: '管理员_modified', avatar: 'avatar_modified', signature: 'my_signature' }),
    }),
  ).rejects.toThrowError(/UnauthorizedError/);

  // 登录成功，拿到 token
  const loginResp = await testFetchJSON(testDomain, 'bbs/login', {
    method: 'post',
    headers: { 'Content-Type': 'application/json', ...defaultHeaders },
    body: JSON.stringify({ username: 'admin', password: '123123', captcha_id: '1', captcha_text: '1234' }),
  });
  const token = loginResp?.data?.token;
  expect(token).toBeTruthy();

  // 修改成功
  expect(
    (
      await testFetchJSON(testDomain, 'bbs/users/1', {
        method: 'post',
        headers: { 'Content-Type': 'application/json', [HEADER_TOKEN]: token, ...defaultHeaders },
        body: JSON.stringify({ nickname: '管理员_modified' }),
      })
    ).success,
  ).toBeTruthy();

  expect((await testFetchJSON(testDomain, 'bbs/users/1', { headers: defaultHeaders })).data?.nickname).toBe('管理员_modified');
});
