import 'whatwg-fetch';
import React, { ReactNode } from 'react';
import QueryString from 'query-string';
import ReactDOM from 'react-dom';
import { initBBSSetting } from '@/models/useBBSSetting';
import { showErrorAlert } from '@/utils/show-alert';
import CustomThemeWrapper from '@/components/custom-theme-wrapper';
import showLoginDialog from '@/utils/show-login-dialog';
import { getLoginUser, setLoginUser } from '@/api/base/user';
import ApiUI from '@/api-ui';
import { loginApi, userApi } from '@/api';
import './app.less';

export async function render(_doRender: Function) {
  try {
    const doRender = async () => {
      _doRender();
      if (ApiUI.onRender) await ApiUI.onRender();
    };
    if (ApiUI.onLoad) await ApiUI.onLoad();
    const setting = await initBBSSetting();
    document.title = setting.site_title || setting.site_name || '';
    document.body.style.fontFamily = `${setting.ui_font_family || 'Roboto'},'Microsoft YaHei',"Helvetica","Arial",sans-serif`; // 设置默认字体

    const queryParamInHash = QueryString.parse(location.hash.replace(/^#/, '').replace(/^.*\?/, ''));
    let loginUser = getLoginUser();

    if (queryParamInHash.MBBS_USER_TOKEN && typeof queryParamInHash.MBBS_USER_TOKEN === 'string') {
      // 链接携带登录 token
      loginUser = await userApi.getLoginUserByToken(queryParamInHash.MBBS_USER_TOKEN);
      setLoginUser({ ...loginUser, token: queryParamInHash.MBBS_USER_TOKEN });
      history.replaceState(null, '', location.hash.replace(/MBBS_USER_TOKEN=.*(&|$)/, '').replace(/\?$/, ''));
    }
    if (queryParamInHash.LOGIN_TOKEN_FROM_QQ && typeof queryParamInHash.LOGIN_TOKEN_FROM_QQ === 'string') {
      const user = await loginApi.loginByQQ({ qq_access_token: queryParamInHash.LOGIN_TOKEN_FROM_QQ });
      if (!user.token) {
        throw new Error('loginByQQ 返回用户 token 为空');
      }
      loginUser = user;
      setLoginUser(user);
      history.replaceState(null, '', location.hash.replace(/LOGIN_TOKEN_FROM_QQ=.*(&|$)/, '').replace(/\?$/, ''));
    }

    if (ApiUI.onInitLoginUser) {
      const initResult = await ApiUI.onInitLoginUser(loginUser);
      if (initResult != loginUser) {
        if (!initResult) setLoginUser(null);
        else if (initResult.token) {
          loginUser = await userApi.getLoginUserByToken(initResult.token);
          setLoginUser({ ...loginUser, token: initResult.token });
        }
      }
    }

    const needLoginFirst = setting.site_need_login_first === '1' || setting.site_close === '1' || /^#\/manage/.test(location.hash);

    if (needLoginFirst && !loginUser) {
      const doLoginBeforeRender = () => {
        showLoginDialog({ closeIcon: false }).then((user) => {
          if (user) {
            doRender();
          } else {
            showErrorAlert({
              message: '请先登录',
              onOk: () => doLoginBeforeRender(),
            });
          }
        });
      };
      doLoginBeforeRender();
    } else {
      doRender();
    }
  } catch (e: any) {
    showErrorAlert(e?.message || String(e));
  }
}

export function rootContainer(container: ReactNode) {
  return <CustomThemeWrapper>{container}</CustomThemeWrapper>;
}

// React 和 ReactDOM 注入全局变量，方便自定义 html 内容的 script 无需再打包 react
(window as any).React = React;
(window as any).ReactDOM = ReactDOM;
