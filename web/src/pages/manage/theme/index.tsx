import React from 'react';
import { useModel } from 'umi';
import EditIcon from '@mui/icons-material/Edit';
import { Button, IconButton, List, ListItem, ListItemText, ListSubheader, MenuItem, Switch, TextField, useTheme } from '@mui/material';
import { settingApi } from '@/api';
import AppPage from '@/components/app-page';
import OpenColorPickerDialog from '@/components/open-color-picker-dialog';
import TipIconButton from '@/components/tip-icon-button';
import MarkdownPureText from '@/components/vditor/markdown-pure-text';
import { DEFAULT_POWER_BY_MARKDOWN } from '@/consts';
import OpenPopupMarkdownEditor from '@/components/open-popup-markdown-editor';
import { getResourceUrl } from '@/utils/resource-url';
import UploadResourceButton from '@/components/upload-resource-button';
import { compressImageFile } from '@/utils/compress-image-util';
import OpenAlertDialog from '@/components/open-alert-dialog';
import { formatHexColor } from '@/utils/format-util';
import DoTaskButton from '@/components/do-task-button';

const BaseSetting = () => {
  const bbsSetting = useModel('useBBSSetting');
  const { categories } = useModel('useCategories');
  const theme = useTheme();

  return (
    <AppPage title="个性化设置" parentPage={[{ title: '管理后台', href: '/manage' }]}>
      <List
        subheader={<ListSubheader component="div">主题设置</ListSubheader>}
        sx={{ background: theme.palette.background.paper, marginTop: 2 }}
        component="nav"
      >
        <ListItem>
          <ListItemText
            primary="设置主题色"
            secondary={
              <>
                {theme.palette.primary.main}{' '}
                <span
                  style={{
                    display: 'inline-block',
                    width: 20,
                    height: 20,
                    background: theme.palette.primary.main,
                    verticalAlign: 'bottom',
                  }}
                />
              </>
            }
          />
          <OpenColorPickerDialog
            title="选择主题色"
            defaultColor={theme.palette.primary.main}
            submitFailAlert
            onSubmit={async (inputValue) => {
              await settingApi.set('ui_theme_primary_color', inputValue);
              bbsSetting.update('ui_theme_primary_color', inputValue);
            }}
          >
            <IconButton color="primary">
              <EditIcon />
            </IconButton>
          </OpenColorPickerDialog>
        </ListItem>
        <ListItem>
          <ListItemText primary="暗色主题" secondary={bbsSetting.ui_theme_dark_mode === '1' ? '开启' : '关闭'} />
          <Switch
            checked={bbsSetting.ui_theme_dark_mode === '1'}
            onChange={async (e) => {
              const checked = e.target.checked;
              await settingApi.set('ui_theme_dark_mode', checked ? '1' : '0');
              bbsSetting.update('ui_theme_dark_mode', checked ? '1' : '0');
            }}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary="设置内容背景色"
            secondary={
              <>
                {theme.palette.background.paper}{' '}
                <span
                  style={{
                    display: 'inline-block',
                    width: 20,
                    height: 20,
                    background: theme.palette.background.paper,
                    verticalAlign: 'bottom',
                  }}
                />
              </>
            }
          />
          <OpenColorPickerDialog
            title="内容背景色"
            defaultColor={theme.palette.background.paper}
            submitFailAlert
            onSubmit={async (inputValue) => {
              await settingApi.set('ui_theme_content_bg_color', inputValue);
              bbsSetting.update('ui_theme_content_bg_color', inputValue);
            }}
          >
            <IconButton color="primary">
              <EditIcon />
            </IconButton>
          </OpenColorPickerDialog>
        </ListItem>
        <ListItem>
          <ListItemText
            primary="设置页面底色"
            secondary={
              <>
                {formatHexColor(bbsSetting.ui_theme_page_bg_color || document.body.style.background) || '未设置'}{' '}
                <span
                  style={{
                    display: 'inline-block',
                    width: 20,
                    height: 20,
                    background: bbsSetting.ui_theme_page_bg_color || document.body.style.background,
                    verticalAlign: 'bottom',
                  }}
                />
              </>
            }
          />
          <OpenColorPickerDialog
            title="页面底色"
            defaultColor={formatHexColor(bbsSetting.ui_theme_page_bg_color || document.body.style.background)}
            submitFailAlert
            onSubmit={async (inputValue) => {
              await settingApi.set('ui_theme_page_bg_color', inputValue);
              bbsSetting.update('ui_theme_page_bg_color', inputValue);
            }}
          >
            <IconButton color="primary">
              <EditIcon />
            </IconButton>
          </OpenColorPickerDialog>
        </ListItem>
        <ListItem>
          <ListItemText
            primary="顶部导航栏背景图"
            secondary={
              bbsSetting.ui_nav_bar_bg_image ? (
                <img alt="nav_bg_img" src={getResourceUrl(bbsSetting.ui_nav_bar_bg_image)} style={{ width: 120, height: 30 }} />
              ) : (
                '未设置'
              )
            }
          />
          {bbsSetting.ui_nav_bar_bg_image ? (
            <OpenAlertDialog
              title="提示"
              message="确定删除 顶部导航栏背景图 吗？"
              cancelText="取消"
              okText="确定"
              onOkErrorAlert
              onOk={async () => {
                await settingApi.batchSet({ ui_nav_bar_bg_image: null });
                bbsSetting.update('ui_nav_bar_bg_image', null);
              }}
            >
              <Button>删除</Button>
            </OpenAlertDialog>
          ) : null}
          <UploadResourceButton
            startIcon={<EditIcon />}
            beforeUpload={(file) => compressImageFile(file)}
            onUploaded={async (result) => {
              await settingApi.batchSet({
                ui_nav_bar_bg_image: result.filePath,
              });
              bbsSetting.update('ui_nav_bar_bg_image', result.filePath);
            }}
          >
            设置
          </UploadResourceButton>
        </ListItem>
        <ListItem>
          <ListItemText
            primary="左侧菜单背景图"
            secondary={
              bbsSetting.ui_nav_menu_bg_image ? (
                <img alt="nav_menu_bg_image" src={getResourceUrl(bbsSetting.ui_nav_menu_bg_image)} style={{ width: 40, height: 100 }} />
              ) : (
                '未设置'
              )
            }
          />
          {bbsSetting.ui_nav_menu_bg_image ? (
            <OpenAlertDialog
              title="提示"
              message="确定删除 左侧菜单背景图 吗？"
              cancelText="取消"
              okText="确定"
              onOkErrorAlert
              onOk={async () => {
                await settingApi.batchSet({ ui_nav_menu_bg_image: null });
                bbsSetting.update('ui_nav_menu_bg_image', null);
              }}
            >
              <Button>删除</Button>
            </OpenAlertDialog>
          ) : null}
          <UploadResourceButton
            startIcon={<EditIcon />}
            beforeUpload={(file) => compressImageFile(file)}
            onUploaded={async (result) => {
              await settingApi.batchSet({
                ui_nav_menu_bg_image: result.filePath,
              });
              bbsSetting.update('ui_nav_menu_bg_image', result.filePath);
            }}
          >
            设置
          </UploadResourceButton>
        </ListItem>
      </List>
      <List
        subheader={<ListSubheader component="div">界面设置</ListSubheader>}
        sx={{ background: theme.palette.background.paper, marginTop: 2 }}
        component="nav"
      >
        <ListItem>
          <ListItemText
            primary={
              <>
                页面底部文案
                <TipIconButton
                  message={
                    '会展示在菜单底部和移动版首页底部。如果域名需要展示备案信息，也可在此设置。\n* 开源论坛有你帮助会更好：希望能保留 "由 mbbs.cc 提供服务" 等字'
                  }
                />
              </>
            }
            secondary={
              <MarkdownPureText
                md={bbsSetting.ui_power_by_text == null ? DEFAULT_POWER_BY_MARKDOWN : bbsSetting.ui_power_by_text || '(空)'}
              />
            }
          />
          <OpenPopupMarkdownEditor
            title="修改页面底部文案"
            defaultValue={bbsSetting.ui_power_by_text == null ? DEFAULT_POWER_BY_MARKDOWN : bbsSetting.ui_power_by_text}
            onSubmitFailAlert
            submitButtonText="确定"
            onSubmit={async (inputValue) => {
              await settingApi.set('ui_power_by_text', inputValue);
              bbsSetting.update('ui_power_by_text', inputValue);
            }}
          >
            <IconButton color="primary">
              <EditIcon />
            </IconButton>
          </OpenPopupMarkdownEditor>
        </ListItem>
        <ListItem>
          <ListItemText
            primary={
              <>
                发帖前提示文案
                <TipIconButton message="会展示在发帖界面，可以设置一些警告提示，如禁止灌水违规等" />
              </>
            }
            secondary={<MarkdownPureText md={bbsSetting.ui_tip_publish_thread || '(空)'} />}
          />
          <OpenPopupMarkdownEditor
            title="修改发帖前提示文案"
            defaultValue={bbsSetting.ui_tip_publish_thread}
            onSubmitFailAlert
            onSubmit={async (inputValue) => {
              await settingApi.set('ui_tip_publish_thread', inputValue);
              bbsSetting.update('ui_tip_publish_thread', inputValue);
            }}
          >
            <IconButton color="primary">
              <EditIcon />
            </IconButton>
          </OpenPopupMarkdownEditor>
        </ListItem>
        <ListItem>
          <ListItemText
            primary={
              <>
                登录前提示文案
                <TipIconButton message="会展示在登录弹窗的登录页面，可以自定义一些提示文案" />
              </>
            }
            secondary={<MarkdownPureText md={bbsSetting.ui_tip_login || '(空)'} />}
          />
          <OpenPopupMarkdownEditor
            title="修改登录前提示文案"
            defaultValue={bbsSetting.ui_tip_login}
            onSubmitFailAlert
            onSubmit={async (inputValue) => {
              await settingApi.set('ui_tip_login', inputValue);
              bbsSetting.update('ui_tip_login', inputValue);
            }}
          >
            <IconButton color="primary">
              <EditIcon />
            </IconButton>
          </OpenPopupMarkdownEditor>
        </ListItem>
        <ListItem>
          <ListItemText
            primary={
              <>
                注册前提示文案
                <TipIconButton message="会展示在登录弹窗的注册页面，可以自定义一些提示文案" />
              </>
            }
            secondary={<MarkdownPureText md={bbsSetting.ui_tip_register || '(空)'} />}
          />
          <OpenPopupMarkdownEditor
            title="修改注册前提示文案"
            defaultValue={bbsSetting.ui_tip_register}
            onSubmitFailAlert
            onSubmit={async (inputValue) => {
              await settingApi.set('ui_tip_register', inputValue);
              bbsSetting.update('ui_tip_register', inputValue);
            }}
          >
            <IconButton color="primary">
              <EditIcon />
            </IconButton>
          </OpenPopupMarkdownEditor>
        </ListItem>
        <ListItem>
          <ListItemText
            primary={
              <>
                首页提示文案
                <TipIconButton message="会展示在论坛首页，可以自定义一些提示文案" />
              </>
            }
            secondary={<MarkdownPureText md={bbsSetting.ui_tip_home_page || '(空)'} />}
          />
          <OpenPopupMarkdownEditor
            title="修改首页提示文案"
            defaultValue={bbsSetting.ui_tip_home_page}
            onSubmitFailAlert
            onSubmit={async (inputValue) => {
              await settingApi.set('ui_tip_home_page', inputValue);
              bbsSetting.update('ui_tip_home_page', inputValue);
            }}
          >
            <IconButton color="primary">
              <EditIcon />
            </IconButton>
          </OpenPopupMarkdownEditor>
        </ListItem>
        {categories && (
          <ListItem>
            <ListItemText
              primary={
                <>
                  首页显示板块内容
                  <TipIconButton message="设置后，进入首页将直接显示目标板块的帖子内容" />
                </>
              }
            />
            <TextField
              select
              label="选择板块"
              size="small"
              sx={{ maxWidth: '50vw', minWidth: 120 }}
              value={bbsSetting.site_home_page_show_category || ''}
              onChange={async (e) => {
                await settingApi.set('site_home_page_show_category', String(e.target.value) as any);
                bbsSetting.update('site_home_page_show_category', String(e.target.value) as any);
              }}
            >
              {(categories || []).map((c) => (
                <MenuItem value={c.id} key={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
            {bbsSetting.site_home_page_show_category && (
              <DoTaskButton
                failAlert
                task={async () => {
                  await settingApi.batchSet({ site_home_page_show_category: null as any });
                  bbsSetting.update('site_home_page_show_category', null as any);
                }}
              >
                删除
              </DoTaskButton>
            )}
          </ListItem>
        )}
      </List>
    </AppPage>
  );
};

export default BaseSetting;
