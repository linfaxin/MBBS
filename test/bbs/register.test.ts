import { getTestDomainPrefix, initJestWithDomain, testFetchJSON } from '../test-utils';

const testDomain = getTestDomainPrefix(__filename);
const defaultHeaders = {};
initJestWithDomain(testDomain);

test('user register', async () => {
  // 获取验证码
  expect((await testFetchJSON(testDomain, 'bbs/register/captcha')).data.svg).toBeTruthy();

  // 注册失败：用户已存在
  await expect(() =>
    testFetchJSON(testDomain, 'bbs/register', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders },
      body: JSON.stringify({ username: 'admin', password: '111111', captcha_id: '1', captcha_text: '1234' }),
    }),
  ).rejects.toThrowError(/Error/);

  // 注册成功，拿到 token
  const resp = await testFetchJSON(testDomain, 'bbs/register', {
    method: 'post',
    headers: { 'Content-Type': 'application/json', ...defaultHeaders },
    body: JSON.stringify({ username: 'user1234', password: '123123', captcha_id: '1', captcha_text: '1234' }),
  });
  expect(resp?.data?.token).toBeTruthy();
});
