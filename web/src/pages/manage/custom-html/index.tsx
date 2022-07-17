import React from 'react';
import { useModel } from 'umi';
import EditIcon from '@mui/icons-material/Edit';
import { Alert, IconButton, List, ListItem, ListItemText, useTheme } from '@mui/material';
import OpenPromptDialog from '@/components/open-prompt-dialog';
import doTaskWithUI from '@/utils/do-task-with-ui';
import { settingApi } from '@/api';
import TipIconButton from '@/components/tip-icon-button';
import AppPage from '@/components/app-page';
import showAlert from '@/utils/show-alert';

const BaseSetting = () => {
  const bbsSetting = useModel('useBBSSetting');
  const theme = useTheme();

  return (
    <AppPage title="自定义HTML" parentPage={[{ title: '管理后台', href: '/manage' }]}>
      <Alert severity="info" sx={{ marginBottom: 2 }}>
        不了解 HTML 知识的请勿自定义 HTML 内容，以免造成论坛打不开等问题。
      </Alert>
      <List sx={{ background: theme.palette.background.paper, marginTop: 2 }} component="nav">
        <ListItem>
          <ListItemText
            primary={
              <>
                额外 html 内容（head）
                <TipIconButton message="添加在 head 位置的额外 html 内容" />
              </>
            }
            secondary={bbsSetting.site_custom_append_head_html || '(空)'}
          />
          <OpenPromptDialog
            title="额外 html 内容（head）"
            defaultValue={bbsSetting.site_custom_append_head_html}
            multiline
            maxInputLength={5000}
            onSubmit={async (inputValue) => {
              await doTaskWithUI({
                task: () => settingApi.set('site_custom_append_head_html', inputValue),
                failAlert: true,
                fullScreenLoading: false,
              });
              bbsSetting.update('site_custom_append_head_html', inputValue);
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
                额外 html 内容（body）
                <TipIconButton message="添加在 body 位置的额外 html 内容" />
              </>
            }
            secondary={bbsSetting.site_custom_append_body_html || '(空)'}
          />
          <OpenPromptDialog
            title="额外 html 内容（body）"
            defaultValue={bbsSetting.site_custom_append_body_html}
            multiline
            maxInputLength={5000}
            onSubmit={async (inputValue) => {
              await doTaskWithUI({
                task: () => settingApi.set('site_custom_append_body_html', inputValue),
                failAlert: true,
                fullScreenLoading: false,
              });
              bbsSetting.update('site_custom_append_body_html', inputValue);
            }}
          >
            <IconButton color="primary">
              <EditIcon />
            </IconButton>
          </OpenPromptDialog>
        </ListItem>
      </List>
    </AppPage>
  );
};

export default BaseSetting;
