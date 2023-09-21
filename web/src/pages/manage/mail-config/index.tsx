import React from 'react';
import { useModel } from 'umi';
import EditIcon from '@mui/icons-material/Edit';
import {
  Alert,
  Box,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListSubheader,
  Switch,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import doTaskWithUI from '@/utils/do-task-with-ui';
import { settingApi } from '@/api';
import AppPage from '@/components/app-page';
import OpenPopupMarkdownEditor from '@/components/open-popup-markdown-editor';
import MarkdownPureText from '@/components/vditor/markdown-pure-text';
import TipIconButton from '@/components/tip-icon-button';
import showAlert from '@/utils/show-alert';
import { history } from '@@/core/history';
import GlobalOrCategoryRadio from '@/components/global-or-category-radio';
import MouseOverTip from '@/components/mouse-over-tip';

const BaseSetting = () => {
  const { user: loginUser } = useModel('useLoginUser');
  const bbsSetting = useModel('useBBSSetting');
  const theme = useTheme();

  const showEditSmtpConfigDialog = (onSuc?: () => void | Promise<void>) => {
    // 提示设置 smtp 服务器/用户名/密码
    let smtpHost = bbsSetting.__internal_mail_config_smtp_host_and_port;
    let smtpUsername = bbsSetting.__internal_mail_config_smtp_username;
    let smtpPassword = bbsSetting.__internal_mail_config_smtp_password;
    showAlert({
      title: '设置发件人信息',
      message: (
        <Box>
          <Typography variant="body2">推荐使用企业邮箱作为发件人，个人邮箱一般每日发件上限较低</Typography>
          <TextField
            sx={{ mt: 2 }}
            label="邮件服务器域名（SMTP）"
            fullWidth
            defaultValue={smtpHost}
            helperText="输入邮件服务器（SMTP）的域名和端口号，格式为 域名:端口号，端口号可不填默认为 25"
            onChange={(e) => (smtpHost = e.target.value)}
          />
          <TextField
            sx={{ mt: 2 }}
            label="发件人账号/地址"
            fullWidth
            defaultValue={smtpUsername}
            onChange={(e) => (smtpUsername = e.target.value)}
          />
          <TextField
            sx={{ mt: 2 }}
            label="发件人密码"
            fullWidth
            type="password"
            defaultValue={smtpPassword}
            onChange={(e) => (smtpPassword = e.target.value)}
          />
        </Box>
      ),
      cancelText: '取消',
      onOkErrorAlert: true,
      onOk: async () => {
        if (!smtpHost) throw new Error('请输入邮件服务器域名');
        if (!smtpUsername) throw new Error('请输入发件人账号/地址');
        if (!smtpPassword) throw new Error('请输入发件人密码');
        await settingApi.batchSet({
          __internal_mail_config_smtp_host_and_port: smtpHost,
          __internal_mail_config_smtp_username: smtpUsername,
          __internal_mail_config_smtp_password: smtpPassword,
        });
        bbsSetting.batchUpdate({
          __internal_mail_config_smtp_host_and_port: smtpHost,
          __internal_mail_config_smtp_username: smtpUsername,
          __internal_mail_config_smtp_password: smtpPassword,
        });
        if (onSuc) {
          await onSuc();
        }
      },
    });
  };

  return (
    <AppPage title="邮件/消息设置" parentPage={[{ title: '管理后台', href: '/manage' }]}>
      <Alert severity="info" sx={{ marginBottom: 2 }}>
        开启邮件功能后，论坛用户可以自主绑定邮箱、用邮箱忘记密码登录、未读消息同步到邮箱。
      </Alert>
      <List
        subheader={<ListSubheader component="div">邮件设置</ListSubheader>}
        sx={{ background: theme.palette.background.paper, marginTop: 2 }}
        component="nav"
      >
        <ListItem>
          <ListItemText primary="开启邮件功能" secondary={bbsSetting.site_enable_email === '1' ? '已开启' : '已关闭'} />
          {bbsSetting.__internal_mail_config_smtp_host_and_port && bbsSetting.site_enable_email === '1' && (
            <MouseOverTip tip="编辑发件人账号密码">
              <IconButton color="primary" onClick={() => showEditSmtpConfigDialog()}>
                <EditIcon />
              </IconButton>
            </MouseOverTip>
          )}
          <Switch
            checked={bbsSetting.site_enable_email === '1'}
            onChange={async (e) => {
              const checked = e.target.checked;
              const setSiteEnableEmail = async (enable: boolean) => {
                await doTaskWithUI({
                  task: () => settingApi.set('site_enable_email', enable ? '1' : '0'),
                  failAlert: true,
                  fullScreenLoading: true,
                });
                bbsSetting.update('site_enable_email', enable ? '1' : '0');
              };

              if (checked) {
                showEditSmtpConfigDialog(() => setSiteEnableEmail(true));
              } else {
                await setSiteEnableEmail(checked);
              }
            }}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary={
              <>
                审核消息通知到系统管理员
                <TipIconButton message="开启后，有新的待审核帖子或用户时，会以消息形式通知到系统管理员" />
              </>
            }
            secondary={bbsSetting.__internal_reviewed_content_notice_admin_email === '1' ? '已开启' : '已关闭'}
          />
          <Switch
            checked={bbsSetting.__internal_reviewed_content_notice_admin_email === '1'}
            onChange={async (e) => {
              const checked = e.target.checked;
              await doTaskWithUI({
                task: () => settingApi.set('__internal_reviewed_content_notice_admin_email', checked ? '1' : '0'),
                failAlert: true,
                fullScreenLoading: true,
              });
              bbsSetting.update('__internal_reviewed_content_notice_admin_email', checked ? '1' : '0');
            }}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary={
              <>
                新帖通知到系统管理员
                <TipIconButton message="开启后，论坛内发布了新帖会及时以消息形式通知到系统管理员" />
              </>
            }
            secondary={
              bbsSetting.__internal_new_thread_notice_admin_email === 'all'
                ? '已开启'
                : bbsSetting.__internal_new_thread_notice_admin_email
                ? '部分板块开启'
                : '未开启'
            }
          />
          <IconButton
            color="primary"
            onClick={() => {
              let __internal_new_thread_notice_admin_email = bbsSetting.__internal_new_thread_notice_admin_email;
              showAlert({
                title: '新帖通知到系统管理员',
                message: (
                  <GlobalOrCategoryRadio
                    textGlobalOff="关闭"
                    textGlobalOn="开启"
                    textCategoryOn="部分板块开启"
                    defaultValue={
                      bbsSetting.__internal_new_thread_notice_admin_email === 'all'
                        ? true
                        : bbsSetting.__internal_new_thread_notice_admin_email
                        ? bbsSetting.__internal_new_thread_notice_admin_email.split(',').map((w) => parseInt(w))
                        : false
                    }
                    onChange={(v) => (__internal_new_thread_notice_admin_email = Array.isArray(v) ? v.join(',') : v ? 'all' : '')}
                  />
                ),
                cancelText: '取消',
                onOkErrorAlert: true,
                okText: '确定',
                onOk: async () => {
                  await settingApi.set('__internal_new_thread_notice_admin_email', __internal_new_thread_notice_admin_email);
                  bbsSetting.update('__internal_new_thread_notice_admin_email', __internal_new_thread_notice_admin_email);
                },
              });
            }}
          >
            <EditIcon />
          </IconButton>
        </ListItem>
      </List>
    </AppPage>
  );
};

export default BaseSetting;
