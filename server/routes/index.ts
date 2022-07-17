import * as fs from 'fs';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import * as dayjs from 'dayjs';
import { noop } from 'lodash';
import { isDevEnv } from '../utils/env-util';
import { getDB, getDBNameFromHost } from '../models/db';
import { getAllSettings, setSettingValue } from '../models/Settings';
import { getBindHosts } from '../utils/bind-host-util';

const express = require('express');
const router = express.Router();

/* GET home page. */
router.get('/', async (req, res, next) => {
  try {
    const hostname = req.hostname;
    // 二级域名
    const dbName = getDBNameFromHost(hostname);
    const db = await getDB(dbName);
    if (!db) {
      res.setHeader('content-type', 'text/html; charset=utf-8');
      res.status(404);
      res.send(`<html>
<head><title>论坛不存在</title><meta name='viewport' content='width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no' /></head>
<body>论坛不存在</body>
</html>`);
      return;
    }
    const setting = await getAllSettings(db);

    if (setting.site_redirect_to_custom_host === '1') {
      const hosts = await getBindHosts(dbName);
      const redirectToHost = (hosts?.[0] || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
      if (redirectToHost && !req.hostname.includes(redirectToHost)) {
        res.redirect(`http://${redirectToHost}`);
        return;
      }
    }

    let pageHtml: string;
    try {
      pageHtml = isDevEnv()
        ? await fetch('http://localhost:8841/').then((resp) => resp.text())
        : fs.readFileSync(require.resolve('../../web/dist/index.html'), 'utf-8');
    } catch (e: any) {
      res.setHeader('content-type', 'text/html; charset=utf-8');
      res.status(500);
      res.send(`<html>
<head><title>获取页面内容失败</title><meta name='viewport' content='width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no' /></head>
<body>获取页面内容失败：${e.message}</body>
</html>`);
      return;
    }
    const { document } = new JSDOM(pageHtml).window;
    document.title = setting.site_title || setting.site_name || '';

    if (req.query.vconsole) {
      document.head.innerHTML += `<script src='https://cdn.jsdelivr.net/npm/vconsole@3.9.1/dist/vconsole.min.js'></script>\n<script>new window.VConsole()</script>\n`;
    }

    if (setting.site_keywords) {
      document.head.innerHTML += `<meta http-equiv='keywords' content='${JSON.stringify(setting.site_keywords)}'>\n`;
    }

    if (setting.site_introduction) {
      document.head.innerHTML += `<meta http-equiv='description' content='${JSON.stringify(setting.site_introduction)}'>\n`;
    }

    if (setting.site_custom_append_head_html) {
      document.head.innerHTML += setting.site_custom_append_head_html;
    }

    if (setting.site_custom_append_body_html) {
      document.body.innerHTML += setting.site_custom_append_body_html;
    }

    if (setting.ui_theme_dark_mode === '1') {
      document.body.style.background = '#212121';
    }
    if (setting.ui_theme_page_bg_color) {
      document.body.style.background = setting.ui_theme_page_bg_color;
    }

    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.send(document.documentElement.outerHTML);

    setSettingValue(db, { last_view_at: dayjs().format('YYYY-MM-DD HH:mm:ss') }).catch(noop); // 更新论坛最近被访问时间
  } catch (e) {
    console.warn(e);
    res.sendStatus(500);
  }
});

router.get('/index.html', (req, res, next) => {
  res.redirect('/');
});

router.get('/agreement', (req, res, next) => {
  res.render('agreement');
});

router.get('/qq_login_suc', (req, res, next) => {
  res.render('qq_login_suc');
});

router.get('/favicon.ico', async (req, res, next) => {
  const hostname = req.hostname;
  const dbName = getDBNameFromHost(hostname);
  const db = await getDB(dbName);
  if (!db) {
    res.statusMessage = 'db not found';
    res.sendStatus(404);
    return;
  }
  const setting = await getAllSettings(db);
  if (setting.favicon) {
    res.redirect('/bbs/resources/' + setting.favicon);
  } else {
    res.redirect('/images/default-favicon.png');
  }
});

router.get('/logo', async (req, res, next) => {
  const hostname = req.hostname;
  const dbName = getDBNameFromHost(hostname);
  const db = await getDB(dbName);
  if (!db) {
    res.statusMessage = 'db not found';
    res.sendStatus(404);
    return;
  }
  const setting = await getAllSettings(db);
  if (setting.logo) {
    res.redirect('/bbs/resources/' + setting.logo);
  } else {
    res.redirect('/images/default-logo.png');
  }
});

router.get('/bbsInfo', async (req, res, next) => {
  let dbName: string;
  if (!dbName) {
    const hostname = req.hostname;
    dbName = getDBNameFromHost(hostname);
  }
  const db = await getDB(dbName);
  if (!db) {
    res.statusMessage = 'db not found';
    res.sendStatus(404);
    return;
  }
  const setting = await getAllSettings(db);
  res.send({
    name: setting.site_name,
    domain: dbName,
  });
});

export default router;
