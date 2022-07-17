import { defineConfig } from 'umi';

export default defineConfig({
  headScripts: [
    `window.MBBS_BASE_URL="http://localhost:884/bbs/"
window.MBBS_RESOURCE_BASE_URL="http://localhost:884/bbs/resources/"
`,
  ],
  publicPath: 'http://localhost:8841/',
  targets: false,
});
