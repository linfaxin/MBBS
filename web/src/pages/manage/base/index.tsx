import React from 'react';
import { useModel, history } from 'umi';
import EditIcon from '@mui/icons-material/Edit';
import { Button, IconButton, List, ListItem, ListItemText, ListSubheader, Switch, TextField, useTheme } from '@mui/material';
import OpenPromptDialog from '@/components/open-prompt-dialog';
import doTaskWithUI from '@/utils/do-task-with-ui';
import { resourcesApi, settingApi } from '@/api';
import UploadResourceButton from '@/components/upload-resource-button';
import { getResourceUrl } from '@/utils/resource-url';
import { compressImageFile } from '@/utils/compress-image-util';
import TipIconButton from '@/components/tip-icon-button';
import { DEFAULT_ATTACHMENT_IMAGE_COMPRESS_SIZE, DEFAULT_ATTACHMENT_LOAD_RATE, ENUM_MAP_ATTACHMENT_IMAGE_COMPRESS_SIZE } from '@/consts';
import { formatSize } from '@/utils/format-util';
import AppPage from '@/components/app-page';
import showAlert from '@/utils/show-alert';
import MarkdownPureText from '@/components/vditor/markdown-pure-text';
import OpenPopupMarkdownEditor from '@/components/open-popup-markdown-editor';
import GlobalOrCategoryRadio from '@/components/global-or-category-radio';
import { getCategoryFullName } from '@/api/category';

const BaseSetting = () => {
  const bbsSetting = useModel('useBBSSetting');
  const { categoriesSorted } = useModel('useCategories');
  const theme = useTheme();

  return (
    <AppPage title="基础设置" parentPage={[{ title: '管理后台', href: '/manage' }]}>
      <List
        subheader={<ListSubheader component="div">基础信息</ListSubheader>}
        sx={{ background: theme.palette.background.paper, marginTop: 2 }}
        component="nav"
      >
        <ListItem>
          <img alt="logo" src={getResourceUrl(bbsSetting.logo) || require('@/images/default-logo.png')} style={{ width: 80, height: 80 }} />
          <ListItemText />
          <UploadResourceButton
            startIcon={<EditIcon />}
            beforeUpload={(file) => compressImageFile(file, { maxWidth: 256, maxHeight: 256, mimeType: 'image/png' })}
            onUploaded={async (result) => {
              const faviconFile = await compressImageFile(result.file, {
                maxWidth: 32,
                maxHeight: 32,
                mimeType: 'image/png',
              });
              const faviconResult = await resourcesApi.upload(faviconFile, 'favicon.png');
              await settingApi.batchSet({
                logo: result.filePath,
                favicon: faviconResult.filePath,
              });
              bbsSetting.update('logo', result.filePath);
            }}
          >
            修改Logo
          </UploadResourceButton>
        </ListItem>
        <ListItem>
          <ListItemText primary="论坛名称" secondary={bbsSetting.site_name || '(未设置)'} />
          <OpenPromptDialog
            title="修改论坛名称"
            defaultValue={bbsSetting.site_name}
            maxInputLength={20}
            onSubmit={async (inputValue) => {
              await doTaskWithUI({
                task: () => settingApi.set('site_name', inputValue),
                failAlert: true,
                fullScreenLoading: false,
              });
              bbsSetting.update('site_name', inputValue);
            }}
          >
            <IconButton color="primary">
              <EditIcon />
            </IconButton>
          </OpenPromptDialog>
        </ListItem>
        <ListItem>
          <ListItemText primary="论坛介绍" secondary={<MarkdownPureText md={bbsSetting.site_introduction || '(未设置)'} />} />
          <OpenPopupMarkdownEditor
            title="修改论坛介绍"
            defaultValue={bbsSetting.site_introduction}
            onSubmitFailAlert
            submitButtonText="确定"
            onSubmit={async (inputValue) => {
              await settingApi.set('site_introduction', inputValue);
              bbsSetting.update('site_introduction', inputValue);
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
                论坛页面标题
                <TipIconButton message="会显示在浏览器窗口标题处" />
              </>
            }
            secondary={bbsSetting.site_title || bbsSetting.site_name || '(未设置)'}
          />
          <OpenPromptDialog
            title="修改论坛页面标题"
            defaultValue={bbsSetting.site_title || bbsSetting.site_name}
            maxInputLength={50}
            onSubmit={async (inputValue) => {
              await doTaskWithUI({
                task: () => settingApi.set('site_title', inputValue),
                failAlert: true,
                fullScreenLoading: false,
              });
              bbsSetting.update('site_title', inputValue);
              document.title = inputValue;
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
                论坛搜索关键字(SEO)
                <TipIconButton message="合理的关键字可以帮助论坛提高来自搜索的曝光（如：百度）" />
              </>
            }
            secondary={bbsSetting.site_keywords || '(未设置)'}
          />
          <OpenPromptDialog
            title="修改论坛搜索关键字"
            defaultValue={bbsSetting.site_keywords}
            maxInputLength={100}
            onSubmit={async (inputValue) => {
              await doTaskWithUI({
                task: () => settingApi.set('site_keywords', inputValue),
                failAlert: true,
                fullScreenLoading: false,
              });
              bbsSetting.update('site_keywords', inputValue);
            }}
          >
            <IconButton color="primary">
              <EditIcon />
            </IconButton>
          </OpenPromptDialog>
        </ListItem>
        <ListItem>
          <ListItemText primary="创建时间" secondary={bbsSetting.created_at || '-'} />
        </ListItem>
      </List>
      <List
        subheader={<ListSubheader component="div">图片附件设置</ListSubheader>}
        sx={{ background: theme.palette.background.paper, marginTop: 2 }}
        component="nav"
      >
        <ListItem>
          <ListItemText
            primary={
              <>
                上传图片分辨率
                <TipIconButton message="上传前先压缩图片，更高分辨率的图片会更清晰，但加载更慢" />
              </>
            }
            secondary={
              ENUM_MAP_ATTACHMENT_IMAGE_COMPRESS_SIZE[bbsSetting.attachment_image_compress_size] ||
              bbsSetting.attachment_image_compress_size ||
              '高'
            }
          />
          <OpenPromptDialog
            title="修改上传图片分辨度"
            defaultValue={bbsSetting.attachment_image_compress_size || DEFAULT_ATTACHMENT_IMAGE_COMPRESS_SIZE}
            options={Object.keys(ENUM_MAP_ATTACHMENT_IMAGE_COMPRESS_SIZE).map((v) => ({
              label: ENUM_MAP_ATTACHMENT_IMAGE_COMPRESS_SIZE[v],
              value: v,
            }))}
            submitFailAlert
            onSubmit={async (inputValue) => {
              const size = parseInt(inputValue);
              if (!size) throw new Error('输入格式错误');
              await settingApi.set('attachment_image_compress_size', `${size}`);
              bbsSetting.update('attachment_image_compress_size', `${size}`);
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
                图片/附件加载限速
                <TipIconButton message="设置论坛资源的限制加载速度，避免下载资源的带宽过高拖慢论坛" />
              </>
            }
            secondary={formatSize(parseInt(bbsSetting.attachment_load_rate) || DEFAULT_ATTACHMENT_LOAD_RATE) + '/s'}
          />
          <OpenPromptDialog
            title="修改图片/附件加载限速"
            defaultValue={bbsSetting.attachment_load_rate || DEFAULT_ATTACHMENT_LOAD_RATE}
            options={[
              { label: '32KB/s', value: 32 * 1024 + '' },
              { label: '64KB/s', value: 64 * 1024 + '' },
              { label: '128KB/s', value: 128 * 1024 + '' },
              { label: '256KB/s', value: 256 * 1024 + '' },
              { label: '512KB/s', value: 512 * 1024 + '' },
              { label: '1M/s', value: 1024 * 1024 + '' },
            ]}
            submitFailAlert
            onSubmit={async (inputValue) => {
              const size = parseInt(inputValue);
              if (!size) throw new Error('输入格式错误');
              await settingApi.set('attachment_load_rate', `${size}`);
              bbsSetting.update('attachment_load_rate', `${size}`);
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
                图片/附件上传大小限制
                <TipIconButton message="设置论坛上传资源的文件大小限制，避免资源文件过大占用储存空间和带宽" />
              </>
            }
            secondary={formatSize(parseInt(bbsSetting.attachment_size_limit) || 10 * 1024 * 1024)}
          />
          <OpenPromptDialog
            title="修改图片/附件上传大小限制"
            defaultValue={bbsSetting.attachment_size_limit || 10 * 1024 * 1024}
            options={[
              { label: '512KB', value: 512 * 1024 + '' },
              { label: '1M', value: 1024 * 1024 + '' },
              { label: '2M', value: 2 * 1024 * 1024 + '' },
              { label: '5M', value: 5 * 1024 * 1024 + '' },
              { label: '10M', value: 10 * 1024 * 1024 + '' },
              { label: '20M', value: 20 * 1024 * 1024 + '' },
            ]}
            submitFailAlert
            onSubmit={async (inputValue) => {
              const size = parseInt(inputValue);
              if (!size) throw new Error('输入格式错误');
              await settingApi.set('attachment_size_limit', `${size}`);
              bbsSetting.update('attachment_size_limit', `${size}`);
            }}
          >
            <IconButton color="primary">
              <EditIcon />
            </IconButton>
          </OpenPromptDialog>
        </ListItem>
      </List>
      <List
        subheader={<ListSubheader component="div">发帖评论设置</ListSubheader>}
        sx={{ background: theme.palette.background.paper, marginTop: 2 }}
        component="nav"
      >
        <ListItem>
          <ListItemText
            primary="发帖审核设置"
            secondary={
              /^\[\d+.*]$/.test(bbsSetting.create_thread_validate)
                ? '部分板块需要审核'
                : bbsSetting.create_thread_validate === '1'
                ? '需要审核'
                : '无需审核'
            }
          />
          <IconButton
            color="primary"
            onClick={() => {
              let create_thread_validate = bbsSetting.create_thread_validate;
              showAlert({
                title: '发帖审核设置',
                message: (
                  <GlobalOrCategoryRadio
                    textGlobalOff="无需审核"
                    textGlobalOn="需要审核"
                    textCategoryOn="部分板块需要审核"
                    defaultValue={
                      /^\[\d+.*]$/.test(create_thread_validate) ? JSON.parse(create_thread_validate) : create_thread_validate === '1'
                    }
                    onChange={(v) => (create_thread_validate = Array.isArray(v) ? JSON.stringify(v) : v ? '1' : '0')}
                  />
                ),
                cancelText: '取消',
                onOkErrorAlert: true,
                okText: '确定',
                onOk: async () => {
                  await settingApi.set('create_thread_validate', create_thread_validate);
                  bbsSetting.update('create_thread_validate', create_thread_validate);
                },
              });
            }}
          >
            <EditIcon />
          </IconButton>
        </ListItem>
        <ListItem>
          <ListItemText
            primary={
              <>
                用户日发帖上限
                <TipIconButton message="用户在所有分类版块的每日可发帖总数上限" />
              </>
            }
            secondary={bbsSetting.person_daily_create_thread || '无限制'}
          />
          <OpenPromptDialog
            title="修改用户日发帖总数上限"
            defaultValue={bbsSetting.person_daily_create_thread}
            maxInputLength={10}
            TextFieldProps={{
              type: 'number',
            }}
            submitFailAlert
            onSubmit={async (inputValue) => {
              await settingApi.set('person_daily_create_thread', inputValue as any);
              bbsSetting.update('person_daily_create_thread', inputValue as any);
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
                用户单版块日发帖上限
                <TipIconButton message="用户在一个分类版块内的每日可发帖数上限" />
              </>
            }
            secondary={bbsSetting.person_daily_create_thread_category || '无限制'}
          />
          <IconButton
            color="primary"
            onClick={() => {
              let configValueAllCategories = bbsSetting.person_daily_create_thread_category;
              let configValueCategoryMapValue = JSON.parse(bbsSetting.person_daily_create_thread_category_map || '{}') as Record<
                string,
                string
              >;
              const Context = () => {
                return (
                  <>
                    <TextField
                      label="全部板块"
                      variant="outlined"
                      fullWidth
                      sx={{ mt: 2 }}
                      size="small"
                      type="number"
                      defaultValue={configValueAllCategories}
                      onChange={(e) => (configValueAllCategories = e.target.value as `${number}`)}
                      helperText="如果需要单独针对板块设置，可以在下方目标板块内填写"
                    />
                    {categoriesSorted &&
                      categoriesSorted.map((c) => (
                        <TextField
                          key={c.id}
                          label={`板块：${getCategoryFullName(c)}`}
                          variant="outlined"
                          fullWidth
                          sx={{ mt: 2 }}
                          size="small"
                          type="number"
                          defaultValue={configValueCategoryMapValue[c.id]}
                          onChange={(e) => (configValueCategoryMapValue[c.id] = e.target.value)}
                        />
                      ))}
                  </>
                );
              };
              showAlert({
                title: '用户单版块日发帖上限',
                message: <Context />,
                onOkErrorAlert: true,
                cancelText: '取消',
                okText: '确定',
                onOk: async () => {
                  await settingApi.batchSet({
                    person_daily_create_thread_category: configValueAllCategories,
                    person_daily_create_thread_category_map: JSON.stringify(configValueCategoryMapValue),
                  });
                  bbsSetting.update('person_daily_create_thread_category', configValueAllCategories);
                  bbsSetting.update('person_daily_create_thread_category_map', JSON.stringify(configValueCategoryMapValue));
                },
              });
            }}
          >
            <EditIcon />
          </IconButton>
        </ListItem>
        <ListItem>
          <ListItemText
            primary={
              <>
                禁止新用户发帖天数
                <TipIconButton message="禁止后，新注册的用户需要在设置的天数后才可以发帖" />
              </>
            }
            secondary={parseInt(bbsSetting.create_thread_join_in_days) || '无限制'}
          />
          <OpenPromptDialog
            title="禁止新用户发帖天数"
            defaultValue={bbsSetting.create_thread_join_in_days}
            maxInputLength={10}
            TextFieldProps={{ type: 'number' }}
            submitFailAlert
            onSubmit={async (inputValue: any) => {
              await settingApi.set('create_thread_join_in_days', inputValue);
              bbsSetting.update('create_thread_join_in_days', inputValue);
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
                禁止新用户评论天数
                <TipIconButton message="设置后，新注册的用户需要在设置的天数后才可以评论/回复" />
              </>
            }
            secondary={parseInt(bbsSetting.reply_thread_join_in_days) || '无限制'}
          />
          <OpenPromptDialog
            title="禁止新用户评论天数"
            defaultValue={bbsSetting.reply_thread_join_in_days}
            maxInputLength={10}
            TextFieldProps={{ type: 'number' }}
            submitFailAlert
            onSubmit={async (inputValue: any) => {
              await settingApi.set('reply_thread_join_in_days', inputValue);
              bbsSetting.update('reply_thread_join_in_days', inputValue);
            }}
          >
            <IconButton color="primary">
              <EditIcon />
            </IconButton>
          </OpenPromptDialog>
        </ListItem>
      </List>
      <List
        subheader={<ListSubheader component="div">登录注册设置</ListSubheader>}
        sx={{ background: theme.palette.background.paper, marginTop: 2 }}
        component="nav"
      >
        <ListItem>
          <ListItemText
            primary="允许新用户注册"
            secondary={
              bbsSetting.register_close === '1' ? '不允许' : bbsSetting.register_close === 'close_username' ? '仅允许三方授权' : '允许'
            }
          />
          <OpenPromptDialog
            title="新用户注册开关"
            defaultValue={bbsSetting.register_close || '0'}
            options={[
              { label: '允许', value: '0' },
              { label: '不允许', value: '1' },
              { label: '仅允许三方授权登录注册', value: 'close_username' },
            ]}
            submitFailAlert
            onSubmit={async (inputValue) => {
              await settingApi.set('register_close', inputValue as any);
              bbsSetting.update('register_close', inputValue as any);
            }}
          >
            <IconButton color="primary">
              <EditIcon />
            </IconButton>
          </OpenPromptDialog>
        </ListItem>
        {bbsSetting.register_close === '1' && (
          <ListItem>
            <ListItemText
              primary={
                <>
                  不允许新用户注册原因
                  <TipIconButton message="设置后，会展示在登录弹窗的注册界面" />
                </>
              }
              secondary={<MarkdownPureText md={bbsSetting.register_close_reason || '(空)'} />}
            />
            <OpenPopupMarkdownEditor
              title="不允许新用户注册原因"
              defaultValue={bbsSetting.register_close_reason}
              submitButtonText="确定"
              onSubmitFailAlert
              onSubmit={async (inputValue) => {
                inputValue = inputValue.replace(/\n$/, '').trim();
                await settingApi.set('register_close_reason', inputValue);
                bbsSetting.update('register_close_reason', inputValue);
              }}
            >
              <IconButton color="primary">
                <EditIcon />
              </IconButton>
            </OpenPopupMarkdownEditor>
          </ListItem>
        )}
        <ListItem>
          <ListItemText primary="新用户注册审核" secondary={bbsSetting.register_validate === '1' ? '已开启' : '已关闭'} />
          <Switch
            checked={bbsSetting.register_validate === '1'}
            onChange={async (e) => {
              const checked = e.target.checked;
              await doTaskWithUI({
                task: () => settingApi.set('register_validate', checked ? '1' : '0'),
                failAlert: true,
                fullScreenLoading: true,
              });
              bbsSetting.update('register_validate', checked ? '1' : '0');
            }}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary={
              <>
                记住用户登录
                <TipIconButton message="关闭后，每次重新打开论坛页面都要再次登录" />
              </>
            }
            secondary={bbsSetting.site_remember_login_days === '0' ? '已关闭' : '已开启'}
          />
          <Switch
            checked={bbsSetting.site_remember_login_days !== '0'}
            onChange={async (e) => {
              const checked = e.target.checked;
              await doTaskWithUI({
                task: () => settingApi.set('site_remember_login_days', checked ? '' : '0'),
                failAlert: true,
                fullScreenLoading: true,
              });
              bbsSetting.update('site_remember_login_days', checked ? '' : '0');
            }}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary={
              <>
                前置登录
                <TipIconButton message="开启后，必须登录后才能进入论坛" />
              </>
            }
            secondary={bbsSetting.site_need_login_first === '1' ? '已开启' : '已关闭'}
          />
          <Switch
            checked={bbsSetting.site_need_login_first === '1'}
            onChange={async (e) => {
              const checked = e.target.checked;
              await doTaskWithUI({
                task: () => settingApi.set('site_need_login_first', checked ? '1' : '0'),
                failAlert: true,
                fullScreenLoading: true,
              });
              bbsSetting.update('site_need_login_first', checked ? '1' : '0');
            }}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary={
              <>
                三方授权登录
                <TipIconButton message="开启后，将支持QQ/微信/支付宝等三方平台授权登录论坛" />
              </>
            }
            secondary={bbsSetting.site_enable_third_platform_login === '1' ? '已开启' : '已关闭'}
          />
          <Switch
            checked={bbsSetting.site_enable_third_platform_login === '1'}
            onChange={async (e) => {
              const checked = e.target.checked;
              await doTaskWithUI({
                task: () => settingApi.set('site_enable_third_platform_login', checked ? '1' : '0'),
                failAlert: true,
                fullScreenLoading: true,
              });
              bbsSetting.update('site_enable_third_platform_login', checked ? '1' : '0');
            }}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary={
              <>
                三方授权登录注册免审核
                <TipIconButton message="开启后，通过三方平台授权登录论坛注册的账号免审核" />
              </>
            }
            secondary={bbsSetting.site_third_platform_login_pass_validate === '1' ? '已开启' : '已关闭'}
          />
          <Switch
            checked={bbsSetting.site_third_platform_login_pass_validate === '1'}
            onChange={async (e) => {
              const checked = e.target.checked;
              await doTaskWithUI({
                task: () => settingApi.set('site_third_platform_login_pass_validate', checked ? '1' : '0'),
                failAlert: true,
                fullScreenLoading: true,
              });
              bbsSetting.update('site_third_platform_login_pass_validate', checked ? '1' : '0');
            }}
          />
        </ListItem>
      </List>
    </AppPage>
  );
};

export default BaseSetting;
