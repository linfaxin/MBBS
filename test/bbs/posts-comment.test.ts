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

test('posts-comment', async () => {
  // 创建帖子
  const createdThread = (
    await testFetchJSON(testDomain, 'bbs/threads/create', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: userAdmin.token },
      body: JSON.stringify({ title: '测试发帖1', content: '测试发帖内容内容内容', category_id: 1 }),
    })
  ).data;

  // 创建评论
  await testFetchJSON(testDomain, 'bbs/posts/create', {
    method: 'post',
    headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    body: JSON.stringify({ thread_id: createdThread.id, content: '评论内容内容' }),
  });

  let getPost1 = (
    await testFetchJSON(testDomain, `bbs/posts/list?thread_id=${createdThread.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    })
  ).data[0];
  expect(getPost1.reply_count).toBe(0);

  const createdPostComment1 = (
    await testFetchJSON(testDomain, 'bbs/posts/createComment', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
      body: JSON.stringify({ post_id: getPost1.id, content: '回复内容内容' }),
    })
  ).data;

  getPost1 = (
    await testFetchJSON(testDomain, `bbs/posts/list?thread_id=${createdThread.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    })
  ).data[0];
  expect(getPost1.reply_count).toBe(1);

  let commentList = (
    await testFetchJSON(testDomain, `bbs/posts/listComments?post_id=${getPost1.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    })
  ).data;
  expect(commentList.length).toBe(1);
  expect(commentList[0].id).toBe(createdPostComment1.id);
  expect(commentList[0].reply_post_id).toBe(getPost1.id);
  expect(commentList[0].content).toBe('回复内容内容');

  const createdPostComment2 = (
    await testFetchJSON(testDomain, 'bbs/posts/createComment', {
      method: 'post',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: userAdmin.token },
      body: JSON.stringify({ post_id: getPost1.id, content: '回复内容内容2', comment_post_id: createdPostComment1.id }),
    })
  ).data;

  getPost1 = (
    await testFetchJSON(testDomain, `bbs/posts/list?thread_id=${createdThread.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    })
  ).data[0];
  expect(getPost1.reply_count).toBe(2);

  commentList = (
    await testFetchJSON(testDomain, `bbs/posts/listComments?post_id=${getPost1.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    })
  ).data;
  expect(commentList.length).toBe(2);
  expect(commentList[0].id).toBe(createdPostComment1.id);
  expect(commentList[0].reply_post_id).toBe(getPost1.id);
  expect(commentList[0].content).toBe('回复内容内容');
  expect(commentList[1].id).toBe(createdPostComment2.id);
  expect(commentList[1].reply_post_id).toBe(getPost1.id);
  expect(commentList[1].content).toBe('回复内容内容2');
  expect(commentList[1].comment_post_id).toBe(createdPostComment1.id);

  // 删除回复
  await testFetchJSON(testDomain, `bbs/posts/${createdPostComment1.id}`, {
    method: 'delete',
    headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
  });

  getPost1 = (
    await testFetchJSON(testDomain, `bbs/posts/list?thread_id=${createdThread.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    })
  ).data[0];
  expect(getPost1.reply_count).toBe(1);

  commentList = (
    await testFetchJSON(testDomain, `bbs/posts/listComments?post_id=${getPost1.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders, [HEADER_TOKEN]: user1.token },
    })
  ).data;
  expect(commentList.length).toBe(1);
  expect(commentList[0].id).toBe(createdPostComment2.id);
});
