import { getTestDomainPrefix, initJestWithDomain, testFetchJSON } from '../test-utils';
import { HEADER_TOKEN } from '../../server/routes/bbs/const';

const testDomain = getTestDomainPrefix(__filename);
const defaultHeaders = {};
initJestWithDomain(testDomain);

let userAdmin;
let user1;
let user2;
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
    testFetchJSON(testDomain, 'bbs/register', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders },
      body: JSON.stringify({ username: 'user2', password: '123123', captcha_id: '1', captcha_text: '1234' }),
    }).then((resp) => (user2 = resp.data)),
  ]);
});

test('thread-draft', async () => {
  // 发布草稿
  const createdThread1 = (
    await testFetchJSON(testDomain, 'bbs/threads/create', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
      body: JSON.stringify({ title: '测试发帖1', content: '测试发帖内容内容内容', category_id: 1, is_draft: true }),
    })
  ).data;
  expect(createdThread1.is_draft).toBe(true);
  const createDraftTime = createdThread1.created_at;

  // 自己可查看
  let userGetThread1 = (
    await testFetchJSON(testDomain, `bbs/threads/${createdThread1.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    })
  ).data;
  expect(userGetThread1.is_draft).toBe(true);
  // 草稿列表可查看
  let user1GetDrafts = (
    await testFetchJSON(testDomain, 'bbs/threads/listMyDrafts', {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    })
  ).data;
  expect(user1GetDrafts.find((d) => d.id === createdThread1.id)).toBeTruthy();

  // 其他用户不可查看
  await expect(
    testFetchJSON(testDomain, `bbs/threads/${createdThread1.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user2.token },
    }),
  ).rejects.toThrowError(/Error/);

  // 修改草稿内容
  const modifyThread1Result = (
    await testFetchJSON(testDomain, `bbs/threads/${createdThread1.id}`, {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
      body: JSON.stringify({ title: '测试发帖2', content: '测试发帖内容内容内容2323', category_id: 1 }),
    })
  ).data;
  expect(modifyThread1Result.is_draft).toBe(true);

  // 从草稿发布
  await testFetchJSON(testDomain, `bbs/threads/${createdThread1.id}`, {
    method: 'post',
    headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    body: JSON.stringify({ title: '测试发帖2', content: '测试发帖内容内容内容3434', category_id: 1, is_draft: false }),
  });

  // 其他用户也可查看
  const user2GetThread1 = (
    await testFetchJSON(testDomain, `bbs/threads/${createdThread1.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user2.token },
    })
  ).data;
  expect(user2GetThread1.is_draft).toBe(false);
  expect(user2GetThread1.created_at).not.toBe(createDraftTime); // 发布后 帖子创建时间 会更新
});

test('thread-draft-thread-validate', async () => {
  // 设置发帖需要审核
  await testFetchJSON(testDomain, 'bbs/setting/set', {
    method: 'post',
    headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: userAdmin.token },
    body: JSON.stringify({ key: 'create_thread_validate', value: '1' }),
  });

  // 发布草稿
  const createdThread1 = (
    await testFetchJSON(testDomain, 'bbs/threads/create', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
      body: JSON.stringify({ title: '测试发帖1', content: '测试发帖内容内容内容', category_id: 1, is_draft: true }),
    })
  ).data;
  expect(createdThread1.is_draft).toBe(true);

  // 自己可查看
  let userGetThread1 = (
    await testFetchJSON(testDomain, `bbs/threads/${createdThread1.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    })
  ).data;
  expect(userGetThread1.is_draft).toBe(true);
  // 草稿列表可查看
  let user1GetDrafts = (
    await testFetchJSON(testDomain, 'bbs/threads/listMyDrafts', {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    })
  ).data;
  expect(user1GetDrafts.find((d) => d.id === createdThread1.id)).toBeTruthy();

  // 其他用户不可查看
  await expect(
    testFetchJSON(testDomain, `bbs/threads/${createdThread1.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user2.token },
    }),
  ).rejects.toThrowError(/Error/);

  // 修改草稿内容
  const modifyThread1Result = (
    await testFetchJSON(testDomain, `bbs/threads/${createdThread1.id}`, {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
      body: JSON.stringify({ title: '测试发帖2', content: '测试发帖内容内容内容2323', category_id: 1 }),
    })
  ).data;
  expect(modifyThread1Result.is_draft).toBe(true);

  // 从草稿发布
  const publishResult = (
    await testFetchJSON(testDomain, `bbs/threads/${createdThread1.id}`, {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
      body: JSON.stringify({ title: '测试发帖2', content: '测试发帖内容内容内容3434', category_id: 1, is_draft: false }),
    })
  ).data;
  expect(publishResult.is_approved).toBe(0);

  // 帖子审核中，无权查看
  await expect(() =>
    testFetchJSON(testDomain, `bbs/threads/${createdThread1.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user2.token },
    }),
  ).rejects.toThrowError(/Error/);

  // 审核通过
  await testFetchJSON(testDomain, 'bbs/threads/setApproved', {
    method: 'post',
    headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: userAdmin.token },
    body: JSON.stringify({ thread_id: createdThread1.id, is_approved: 1 }),
  });

  // 其他用户也可查看
  const user2GetThread1 = (
    await testFetchJSON(testDomain, `bbs/threads/${createdThread1.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user2.token },
    })
  ).data;
  expect(user2GetThread1.is_draft).toBe(false);
});
