import React, { useState } from 'react';
import Clipboard from 'react-clipboard.js';
import { Alert, Button, List, ListItem, ListItemText, useTheme } from '@mui/material';
import TipIconButton from '@/components/tip-icon-button';
import AppPage from '@/components/app-page';
import DoTaskButton from '@/components/do-task-button';
import { manageApi } from '@/api';
import showSnackbar from '@/utils/show-snackbar';
import { toAbsUrl } from '@/utils/url-util';
import { useModel } from 'umi';

const BaseSetting = () => {
  const bbsSetting = useModel('useBBSSetting');
  const theme = useTheme();
  const [token, setToken] = useState('');
  const loadAdminToken = async () => {
    setToken(await manageApi.getAdminApiToken());
  };

  return (
    <AppPage title="Admin Token" parentPage={[{ title: '管理后台', href: '/manage' }]} initPage={loadAdminToken}>
      <Alert severity="info" sx={{ marginBottom: 2 }}>
        使用 Admin Token 即拥有对论坛的所有管理操作权限，注意妥善保管
      </Alert>
      <List sx={{ background: theme.palette.background.paper, marginTop: 2 }} component="nav">
        <ListItem>
          <ListItemText primary="Admin Token" secondary={token || '(空，请先重置)'} />
          <DoTaskButton
            color="primary"
            variant="outlined"
            failAlert
            task={async () => {
              setToken(await manageApi.resetAdminApiToken());
              showSnackbar('重置成功');
            }}
          >
            重置
          </DoTaskButton>
        </ListItem>
        <ListItem>
          <ListItemText
            primary={
              <>
                Admin Token 管理后台链接
                <TipIconButton message="使用基于 Admin Token 的后台管理链接可以免登录直接进入论坛后台管理页面，注意妥善保管 Admin Token 和链接" />
              </>
            }
            secondary={token ? toAbsUrl(`#/manage?MBBS_USER_TOKEN=${token}`) : '(空，请先重置 Admin Token)'}
          />
          {!!token && (
            <Clipboard
              data-clipboard-text={toAbsUrl(`#/manage?MBBS_USER_TOKEN=${token}`)}
              component="span"
              onSuccess={() => showSnackbar('已复制到剪切板')}
              onError={() => showSnackbar('复制失败')}
            >
              <Button color="primary" variant="outlined">
                复制链接
              </Button>
            </Clipboard>
          )}
        </ListItem>
      </List>
    </AppPage>
  );
};

export default BaseSetting;
