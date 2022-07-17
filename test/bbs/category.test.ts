import { getTestDomainPrefix, initJestWithDomain, testFetchJSON } from '../test-utils';
import { HEADER_TOKEN } from '../../server/routes/bbs/const';

const testDomain = getTestDomainPrefix(__filename);
const defaultHeaders = {};
initJestWithDomain(testDomain);

test('category-crud', async () => {
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
      await testFetchJSON(testDomain, 'bbs/category/addCategory', {
        method: 'post',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({ name: 'MyName', description: 'MyDescription' }),
      })
    ).success,
  ).toBeTruthy();
  expect(
    (
      await testFetchJSON(testDomain, 'bbs/category/addCategory', {
        method: 'post',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({ name: 'MyName2', description: 'MyDescription2' }),
      })
    ).success,
  ).toBeTruthy();

  // list
  let allCategories = (
    await testFetchJSON(testDomain, 'bbs/category/listCategory', {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...adminHeaders },
    })
  ).data;
  expect(allCategories.find((g) => g.name === 'MyName')).toBeTruthy();
  expect(allCategories.find((g) => g.name === 'MyName2')).toBeTruthy();

  // remove
  expect(
    (
      await testFetchJSON(testDomain, 'bbs/category/removeCategory', {
        method: 'post',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({ category_id: allCategories.find((g) => g.name === 'MyName2').id }),
      })
    ).success,
  ).toBeTruthy();

  allCategories = (
    await testFetchJSON(testDomain, 'bbs/category/listCategory', {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...adminHeaders },
    })
  ).data;

  expect(allCategories.find((g) => g.name === 'MyName')).toBeTruthy();
  expect(allCategories.find((g) => g.name === 'MyName2')).toBeFalsy();

  // edit
  expect(
    (
      await testFetchJSON(testDomain, 'bbs/category/setCategory', {
        method: 'post',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({ category_id: allCategories.find((g) => g.name === 'MyName').id, name: 'MyName_edit' }),
      })
    ).success,
  ).toBeTruthy();

  allCategories = (
    await testFetchJSON(testDomain, 'bbs/category/listCategory', {
      method: 'get',
      headers: { 'Content-Type': 'application/json', ...adminHeaders },
    })
  ).data;
  expect(allCategories.find((g) => g.name === 'MyName')).toBeFalsy();
  expect(allCategories.find((g) => g.name === 'MyName_edit')).toBeTruthy();
});
