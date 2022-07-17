import { getTestDomainPrefix, initJestWithDomain, testFetchJSON } from '../test-utils';
import { HEADER_TOKEN } from '../../server/routes/bbs/const';

const testDomain = getTestDomainPrefix(__filename);
const defaultHeaders = {};
initJestWithDomain(testDomain);

let userAdmin;
let user1;
beforeAll(async () => {
  await Promise.all([
    testFetchJSON(testDomain, 'bbs/login', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders },
      body: JSON.stringify({ username: 'admin', password: '123123', captcha_id: '1', captcha_text: '1234' }),
    }).then((resp) => (userAdmin = resp.data)),
    testFetchJSON(testDomain, 'bbs/register', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders },
      body: JSON.stringify({ username: 'user1', password: '123123', captcha_id: '1', captcha_text: '1234' }),
    }).then((resp) => (user1 = resp.data)),
  ]);
});

test('thread-essence', async () => {
  const createdThread1 = (
    await testFetchJSON(testDomain, 'bbs/threads/create', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: userAdmin.token },
      body: JSON.stringify({ title: '测试发帖1', content: '测试发帖内容内容内容', category_id: 1 }),
    })
  ).data;

  let userGetThread1 = (
    await testFetchJSON(testDomain, `bbs/threads/${createdThread1.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    })
  ).data;
  expect(userGetThread1.is_essence).toBeFalsy();

  // user1 操作精华：无权限
  await expect(() =>
    testFetchJSON(testDomain, 'bbs/threads/setEssence', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
      body: JSON.stringify({ thread_id: createdThread1.id, is_essence: true }),
    }),
  ).rejects.toThrowError(/Error/);

  // 精华 thread1
  await testFetchJSON(testDomain, 'bbs/threads/setEssence', {
    method: 'post',
    headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: userAdmin.token },
    body: JSON.stringify({ thread_id: createdThread1.id, is_essence: true }),
  });

  userGetThread1 = (
    await testFetchJSON(testDomain, `bbs/threads/${createdThread1.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    })
  ).data;
  expect(userGetThread1.is_essence).toBeTruthy();

  // 取消精华
  await testFetchJSON(testDomain, 'bbs/threads/setEssence', {
    method: 'post',
    headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: userAdmin.token },
    body: JSON.stringify({ thread_id: createdThread1.id, is_essence: false }),
  });

  userGetThread1 = (
    await testFetchJSON(testDomain, `bbs/threads/${createdThread1.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    })
  ).data;
  expect(userGetThread1.is_essence).toBeFalsy();
});
