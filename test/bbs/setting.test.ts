import { getTestDomainPrefix, initJestWithDomain, testFetchJSON } from '../test-utils';
import { HEADER_TOKEN } from '../../server/routes/bbs/const';

const testDomain = getTestDomainPrefix(__filename);
const defaultHeaders = {};
initJestWithDomain(testDomain);

test('setting-crud', async () => {
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
      await testFetchJSON(testDomain, 'bbs/setting/set', {
        method: 'post',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({ key: 'key1', value: 'value1' }),
      })
    ).success,
  ).toBeTruthy();
  expect(
    (
      await testFetchJSON(testDomain, 'bbs/setting/set', {
        method: 'post',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({ key: 'key2', value: 'value2' }),
      })
    ).success,
  ).toBeTruthy();

  // get
  let settings = (
    await testFetchJSON(testDomain, 'bbs/setting/getAll', {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders },
    })
  ).data;

  expect(settings.key1).toBe('value1');
  expect(settings.key2).toBe('value2');

  // remove
  expect(
    (
      await testFetchJSON(testDomain, 'bbs/setting/set', {
        method: 'post',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({ key: 'key2', value: null }),
      })
    ).success,
  ).toBeTruthy();

  settings = (
    await testFetchJSON(testDomain, 'bbs/setting/getAll', {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders },
    })
  ).data;
  expect(settings.key1).toBe('value1');
  expect(settings.key2).toBeFalsy();

  // edit
  expect(
    (
      await testFetchJSON(testDomain, 'bbs/setting/set', {
        method: 'post',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({ key: 'key1', value: 'value111' }),
      })
    ).success,
  ).toBeTruthy();

  settings = (
    await testFetchJSON(testDomain, 'bbs/setting/getAll', {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...defaultHeaders },
    })
  ).data;
  expect(settings.key1).toBe('value111');
});
