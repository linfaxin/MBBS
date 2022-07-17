import { getTestDomainPrefix, initJestWithDomain, testFetchJSON } from '../test-utils';

const testDomain = getTestDomainPrefix(__filename);
const defaultHeaders = {};
initJestWithDomain(testDomain);

test('user login', async () => {
  // 获取验证码
  expect((await testFetchJSON(testDomain, 'bbs/login/captcha')).data.svg).toBeTruthy();

  // 登录失败：密码错误
  await expect(() =>
    testFetchJSON(testDomain, 'bbs/login', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders },
      body: JSON.stringify({ username: 'admin', password: '111111', captcha_id: '1', captcha_text: '1234' }),
    }),
  ).rejects.toThrowError(/Error/);

  // 登录成功，拿到 token
  const loginResp = await testFetchJSON(testDomain, 'bbs/login', {
    method: 'post',
    headers: { 'Content-Type': 'application/json', ...defaultHeaders },
    body: JSON.stringify({ username: 'admin', password: '123123', captcha_id: '1', captcha_text: '1234' }),
  });
  expect(loginResp?.data?.token).toBeTruthy();
});
