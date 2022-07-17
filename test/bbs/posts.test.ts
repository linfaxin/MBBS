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

test('posts-crud', async () => {
  const createdThread = (
    await testFetchJSON(testDomain, 'bbs/threads/create', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: userAdmin.token },
      body: JSON.stringify({ title: '测试发帖1', content: '测试发帖内容内容内容', category_id: 1 }),
    })
  ).data;

  let getCreatedThread = (
    await testFetchJSON(testDomain, `bbs/threads/${createdThread.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    })
  ).data;
  expect(getCreatedThread.content).toBe('测试发帖内容内容内容');
  expect(getCreatedThread.reply_count).toBe(0);

  const createdPost1 = (
    await testFetchJSON(testDomain, 'bbs/posts/create', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
      body: JSON.stringify({ thread_id: createdThread.id, content: '评论内容内容' }),
    })
  ).data;

  getCreatedThread = (
    await testFetchJSON(testDomain, `bbs/threads/${createdThread.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    })
  ).data;
  expect(getCreatedThread.reply_count).toBe(1);

  let postList = (
    await testFetchJSON(testDomain, `bbs/posts/list?thread_id=${createdThread.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    })
  ).data;
  expect(postList.length).toBe(1);
  expect(postList[0].id).toBe(createdPost1.id);
  expect(postList[0].content).toBe('评论内容内容');

  const modifyResp = await testFetchJSON(testDomain, `bbs/posts/${createdPost1.id}`, {
    method: 'post',
    headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    body: JSON.stringify({ content: '评论内容内容_modify' }),
  });
  expect(modifyResp.success).toBeTruthy();

  postList = (
    await testFetchJSON(testDomain, `bbs/posts/list?thread_id=${createdThread.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    })
  ).data;
  expect(postList[0].content).toBe('评论内容内容_modify');

  const createdPost2 = (
    await testFetchJSON(testDomain, 'bbs/posts/create', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
      body: JSON.stringify({ thread_id: createdThread.id, content: '评论内容内容2' }),
    })
  ).data;

  getCreatedThread = (
    await testFetchJSON(testDomain, `bbs/threads/${createdThread.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    })
  ).data;
  expect(getCreatedThread.reply_count).toBe(2);

  postList = (
    await testFetchJSON(testDomain, `bbs/posts/list?thread_id=${createdThread.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    })
  ).data;
  expect(postList.length).toBe(2);
  expect(postList[0].id).toBe(createdPost1.id);
  expect(postList[1].id).toBe(createdPost2.id);
  expect(postList[1].content).toBe('评论内容内容2');

  // 删除评论
  await testFetchJSON(testDomain, `bbs/posts/${createdPost1.id}`, {
    method: 'delete',
    headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
  });

  getCreatedThread = (
    await testFetchJSON(testDomain, `bbs/threads/${createdThread.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    })
  ).data;
  expect(getCreatedThread.reply_count).toBe(1);

  postList = (
    await testFetchJSON(testDomain, `bbs/posts/list?thread_id=${createdThread.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    })
  ).data;
  expect(postList.length).toBe(1);
  expect(postList[0].id).toBe(createdPost2.id);
});
