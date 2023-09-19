import { defineConfig } from 'umi';
import { join } from 'path';

export default defineConfig({
  nodeModulesTransform: {
    type: 'none',
  },
  hash: true,
  history: { type: 'hash' },
  title: false, // 禁止 umi 默认的 title 动态渲染实现
  routes: [
    {
      path: '/',
      component: '@/layouts/index',
      routes: [
        { path: '/', component: '@/pages/index' },
        { path: '/thread/detail/:id', component: '@/pages/thread/detail' },
        { path: '/thread/add', component: '@/pages/thread/add' },
        { path: '/thread/edit/:id', component: '@/pages/thread/edit' },
        { path: '/thread/category/:id', component: '@/pages/thread/category' },
        { path: '/thread/search', component: '@/pages/thread/search' },
        { path: '/personal-center', component: '@/pages/personal-center/index' },
        { path: '/personal-message-center', component: '@/pages/personal-center/message-center' },
        { path: '/user/detail', component: '@/pages/user/detail' },
        { path: '/user/threads', component: '@/pages/user/threads' },
        { path: '/user/posts', component: '@/pages/user/posts' },
        { path: '/manage', component: '@/pages/manage/index' },
        { path: '/manage/base', component: '@/pages/manage/base' },
        { path: '/manage/user', component: '@/pages/manage/user' },
        { path: '/manage/thread', component: '@/pages/manage/thread' },
        { path: '/manage/thread-tag', component: '@/pages/manage/thread-tag' },
        { path: '/manage/category', component: '@/pages/manage/category' },
        { path: '/manage/group', component: '@/pages/manage/group' },
        { path: '/manage/permission', component: '@/pages/manage/permission' },
        { path: '/manage/custom-html', component: '@/pages/manage/custom-html' },
        { path: '/manage/admin-token', component: '@/pages/manage/admin-token' },
        { path: '/manage/close-bbs', component: '@/pages/manage/close-bbs' },
        { path: '/manage/theme', component: '@/pages/manage/theme' },
        { path: '/manage/bind-host', component: '@/pages/manage/bind-host' },
        { path: '/manage/export-db', component: '@/pages/manage/export-db' },
        { path: '/manage/mail-config', component: '@/pages/manage/mail-config' },
      ],
    },
  ],
  targets: {
    chrome: 49,
    ios: 10,
    android: 5,
  },
  extraBabelIncludes: [
    join(__dirname, 'node_modules/@material-ui'),
    join(__dirname, 'node_modules/@mui'),
    join(__dirname, 'node_modules/vditor'),
  ],
  crossorigin: {
    include: [/mbbs-web/],
  },
  fastRefresh: {},
  inlineLimit: 30000, // <30k 均被打包为 base64
  headScripts: [
    `window.MBBS_BASE_URL = "/bbs/";
window.MBBS_RESOURCE_BASE_URL = "/bbs/resources/";
`,
  ],
});
