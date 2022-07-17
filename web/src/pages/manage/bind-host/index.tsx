import React from 'react';
import { useModel } from 'umi';
import EditIcon from '@mui/icons-material/Edit';
import { Alert, Button, IconButton, List, ListItem, ListItemText, Switch, useTheme } from '@mui/material';
import OpenPromptDialog from '@/components/open-prompt-dialog';
import { manageApi, settingApi } from '@/api';
import AppPage from '@/components/app-page';
import { useRequest } from 'ahooks';
import AppLink from '@/components/app-link';
import showAlert from '@/utils/show-alert';
import TipIconButton from '@/components/tip-icon-button';
import doTaskWithUI from '@/utils/do-task-with-ui';

const BindHostPage = () => {
  const bbsSetting = useModel('useBBSSetting');
  const theme = useTheme();
  const { data: hostsInfo, refresh } = useRequest(() => manageApi.getBindHosts());

  return (
    <AppPage title="绑定域名" parentPage={[{ title: '管理后台', href: '/manage' }]}>
      <Alert severity="info" sx={{ marginBottom: 2 }}>
        建议设置绑定域名并开启图片防盗链
      </Alert>
      <List sx={{ background: theme.palette.background.paper, marginTop: 2 }} component="nav">
        <ListItem>
          <ListItemText primary="绑定域名" secondary={hostsInfo?.hosts || '(空)'} />
          <OpenPromptDialog
            title="绑定自定义域名"
            description="请输入你的绑定域名，多个域名请换行分隔"
            defaultValue={hostsInfo?.hosts}
            multiline
            maxInputLength={500}
            submitFailAlert
            onSubmit={async (inputValue) => {
              await manageApi.setBindHosts(inputValue);
              refresh();
            }}
          >
            <IconButton color="primary">
              <EditIcon />
            </IconButton>
          </OpenPromptDialog>
        </ListItem>
        <ListItem>
          <ListItemText
            primary={
              <>
                图片资源防盗链
                <TipIconButton message="开启后，仅绑定域名的网页可以访问论坛的图片资源链接" />
              </>
            }
            secondary={bbsSetting.__internal_check_referer === '1' ? '已开启' : '已关闭'}
          />
          <Switch
            checked={bbsSetting.__internal_check_referer === '1'}
            onChange={async (e) => {
              const checked = e.target.checked;
              await doTaskWithUI({
                task: () => settingApi.set('__internal_check_referer', checked ? '1' : '0'),
                failAlert: true,
                fullScreenLoading: true,
              });
              bbsSetting.update('__internal_check_referer', checked ? '1' : '0');
            }}
          />
        </ListItem>
      </List>
    </AppPage>
  );
};

export default BindHostPage;
