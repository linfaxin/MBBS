import React from 'react';
import { useModel } from 'umi';
import EditIcon from '@mui/icons-material/Edit';
import { Alert, IconButton, List, ListItem, ListItemText, Switch, useTheme } from '@mui/material';
import doTaskWithUI from '@/utils/do-task-with-ui';
import { settingApi } from '@/api';
import AppPage from '@/components/app-page';
import OpenPopupMarkdownEditor from '@/components/open-popup-markdown-editor';
import MarkdownPureText from '@/components/vditor/markdown-pure-text';

const BaseSetting = () => {
  const bbsSetting = useModel('useBBSSetting');
  const theme = useTheme();

  return (
    <AppPage title="关闭论坛" parentPage={[{ title: '管理后台', href: '/manage' }]}>
      <Alert severity="info" sx={{ marginBottom: 2 }}>
        论坛关闭后，将禁止游客和所有用户进入论坛。关闭后可以用 admin 账号登录进此页面重新开启。
      </Alert>
      <List sx={{ background: theme.palette.background.paper, marginTop: 2 }} component="nav">
        <ListItem>
          <ListItemText primary="关闭论坛" secondary={bbsSetting.site_close === '1' ? '已关闭' : '正常（未关闭）'} />
          <Switch
            checked={bbsSetting.site_close === '1'}
            onChange={async (e) => {
              const checked = e.target.checked;
              await doTaskWithUI({
                task: () => settingApi.set('site_close', checked ? '1' : '0'),
                failAlert: true,
                fullScreenLoading: true,
              });
              bbsSetting.update('site_close', checked ? '1' : '0');
            }}
          />
        </ListItem>
        <ListItem>
          <ListItemText primary="关闭论坛原因（选填）" secondary={<MarkdownPureText md={bbsSetting.site_close_msg || '(空)'} />} />
          <OpenPopupMarkdownEditor
            title="关闭论坛原因"
            defaultValue={bbsSetting.site_close_msg}
            submitButtonText="确定"
            onSubmitFailAlert
            onSubmit={async (inputValue) => {
              await settingApi.set('site_close_msg', inputValue);
              bbsSetting.update('site_close_msg', inputValue);
            }}
          >
            <IconButton color="primary">
              <EditIcon />
            </IconButton>
          </OpenPopupMarkdownEditor>
        </ListItem>
      </List>
    </AppPage>
  );
};

export default BaseSetting;
