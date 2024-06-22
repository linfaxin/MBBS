import React, { useState } from 'react';
import { history } from 'umi';
import AppPage from '@/components/app-page';
import { Container, List, ListItem, ListItemText, ListSubheader, Typography, useTheme } from '@mui/material';
import PermissionScopeRadio, { getPermissionScopeValue } from './components/permission-scope-radio';
import Form, { Field, useForm } from 'rc-field-form';
import { permissionApi } from '@/api';
import showSnackbar from '@/utils/show-snackbar';
import DoTaskButton from '@/components/do-task-button';
import { PermissionType } from '@/api/permission';
import { GROUP_ID_TOURIST } from '@/consts';

const PermissionPage = () => {
  const [form] = useForm();
  const theme = useTheme();
  const { groupId, groupName } = history.location.query || {};
  const [permissions, setPermissions] = useState<PermissionType[]>([]);
  const isTourist = groupId == String(GROUP_ID_TOURIST);

  if (!permissions) {
    return null;
  }
  return (
    <AppPage
      title="角色权限设置"
      parentPage={[{ title: '管理后台', href: '/manage' }]}
      initPage={async () => {
        setPermissions(await permissionApi.getPermissions(String(groupId)));
      }}
    >
      <Typography variant="h6" p={2}>
        角色：{String(groupName || groupId)}
      </Typography>
      <Form form={form}>
        <List
          sx={{ background: theme.palette.background.paper }}
          component="nav"
          subheader={<ListSubheader component="div">查看权限</ListSubheader>}
        >
          <ListItem divider>
            <ListItemText primary="浏览帖子" />
            <Field name="viewThreads" initialValue={getPermissionScopeValue(permissions, 'viewThreads')}>
              <PermissionScopeRadio />
            </Field>
          </ListItem>
          <ListItem divider>
            <ListItemText primary="浏览帖子评论" />
            <Field name="thread.viewPosts" initialValue={getPermissionScopeValue(permissions, 'thread.viewPosts')}>
              <PermissionScopeRadio />
            </Field>
          </ListItem>
          <ListItem divider>
            <ListItemText primary="搜索用户" />
            <Field name="user.search" initialValue={permissions.includes('user.search')}>
              <PermissionScopeRadio isCategoryPermission={false} />
            </Field>
          </ListItem>
          <ListItem divider>
            <ListItemText primary="查看其他用户信息" />
            <Field name="user.view" initialValue={permissions.includes('user.view')}>
              <PermissionScopeRadio isCategoryPermission={false} />
            </Field>
          </ListItem>
          <ListItem divider>
            <ListItemText primary="查看指定用户所有帖子" />
            <Field name="user.view.threads" initialValue={permissions.includes('user.view.threads')}>
              <PermissionScopeRadio isCategoryPermission={false} />
            </Field>
          </ListItem>
          <ListItem>
            <ListItemText primary="查看指定用户所有评论/回复" />
            <Field name="user.view.posts" initialValue={permissions.includes('user.view.posts')}>
              <PermissionScopeRadio isCategoryPermission={false} />
            </Field>
          </ListItem>
        </List>
        {!isTourist && (
          <List
            sx={{ background: theme.palette.background.paper, marginTop: 2 }}
            component="nav"
            subheader={<ListSubheader component="div">编辑权限</ListSubheader>}
          >
            <ListItem divider>
              <ListItemText primary="发布帖子" />
              <Field name="createThread" initialValue={getPermissionScopeValue(permissions, 'createThread')}>
                <PermissionScopeRadio />
              </Field>
            </ListItem>
            <ListItem divider>
              <ListItemText primary="发布隐藏内容帖子" secondary="帖子内容默认隐藏，评论/回复后可见" />
              <Field name="thread.createHiddenContent" initialValue={getPermissionScopeValue(permissions, 'thread.createHiddenContent')}>
                <PermissionScopeRadio />
              </Field>
            </ListItem>
            <ListItem divider>
              <ListItemText primary="修改自己的帖子" />
              <Field name="thread.editOwnThread" initialValue={getPermissionScopeValue(permissions, 'thread.editOwnThread')}>
                <PermissionScopeRadio />
              </Field>
            </ListItem>
            <ListItem divider>
              <ListItemText primary="删除自己的帖子" />
              <Field name="thread.hideOwnThread" initialValue={getPermissionScopeValue(permissions, 'thread.hideOwnThread')}>
                <PermissionScopeRadio />
              </Field>
            </ListItem>
            <ListItem divider>
              <ListItemText primary="发帖免审核" secondary="如果论坛开启了发帖审核，可以在此设置当前角色在指定板块发帖免审核" />
              <Field name="thread.ignoreCreateValidate" initialValue={getPermissionScopeValue(permissions, 'thread.ignoreCreateValidate')}>
                <PermissionScopeRadio />
              </Field>
            </ListItem>
            <ListItem divider>
              <ListItemText primary="发布评论/回复" />
              <Field name="thread.reply" initialValue={getPermissionScopeValue(permissions, 'thread.reply')}>
                <PermissionScopeRadio />
              </Field>
            </ListItem>
            <ListItem divider>
              <ListItemText primary="修改自己的评论" />
              <Field name="thread.editOwnPost" initialValue={getPermissionScopeValue(permissions, 'thread.editOwnPost')}>
                <PermissionScopeRadio />
              </Field>
            </ListItem>
            <ListItem divider>
              <ListItemText primary="删除自己的评论" />
              <Field name="thread.hideOwnPost" initialValue={getPermissionScopeValue(permissions, 'thread.hideOwnPost')}>
                <PermissionScopeRadio />
              </Field>
            </ListItem>
            <ListItem divider>
              <ListItemText primary="删除自己帖子的他人评论" secondary="楼主可管理自己帖子下的评论/回复" />
              <Field name="thread.hideOwnThreadAllPost" initialValue={getPermissionScopeValue(permissions, 'thread.hideOwnThreadAllPost')}>
                <PermissionScopeRadio />
              </Field>
            </ListItem>
            <ListItem>
              <ListItemText primary="置顶自己帖子下的评论" secondary="楼主可置顶自己帖子下的评论" />
              <Field name="thread.stickyOwnThreadPost" initialValue={getPermissionScopeValue(permissions, 'thread.stickyOwnThreadPost')}>
                <PermissionScopeRadio />
              </Field>
            </ListItem>
          </List>
        )}
        {!isTourist && (
          <List
            sx={{ background: theme.palette.background.paper, marginTop: 2 }}
            component="nav"
            subheader={<ListSubheader component="div">功能权限</ListSubheader>}
          >
            <ListItem divider>
              <ListItemText primary="帖子点赞" />
              <Field name="thread.like" initialValue={getPermissionScopeValue(permissions, 'thread.like')}>
                <PermissionScopeRadio />
              </Field>
            </ListItem>
            <ListItem divider>
              <ListItemText primary="评论点赞" />
              <Field name="thread.likePosts" initialValue={getPermissionScopeValue(permissions, 'thread.likePosts')}>
                <PermissionScopeRadio />
              </Field>
            </ListItem>
            <ListItem divider>
              <ListItemText primary="上传图片" secondary="发布帖子/评论内容时可以携带图片" />
              <Field name="attachment.create.1" initialValue={permissions.includes('attachment.create.1')}>
                <PermissionScopeRadio isCategoryPermission={false} />
              </Field>
            </ListItem>
            <ListItem>
              <ListItemText primary="上传视频/附件" secondary="发布帖子/评论内容时可以携带视频/下载附件" />
              <Field name="attachment.create.0" initialValue={permissions.includes('attachment.create.0')}>
                <PermissionScopeRadio isCategoryPermission={false} />
              </Field>
            </ListItem>
          </List>
        )}
        {!isTourist && (
          <List
            sx={{ background: theme.palette.background.paper, marginTop: 2 }}
            component="nav"
            subheader={<ListSubheader component="div">管理权限</ListSubheader>}
          >
            <ListItem divider>
              <ListItemText primary="修改全部帖子" />
              <Field name="thread.edit" initialValue={getPermissionScopeValue(permissions, 'thread.edit')}>
                <PermissionScopeRadio />
              </Field>
            </ListItem>
            <ListItem divider>
              <ListItemText primary="删除全部帖子" />
              <Field name="thread.hide" initialValue={getPermissionScopeValue(permissions, 'thread.hide')}>
                <PermissionScopeRadio />
              </Field>
            </ListItem>
            <ListItem divider>
              <ListItemText primary="修改全部评论" />
              <Field name="thread.editPosts" initialValue={getPermissionScopeValue(permissions, 'thread.editPosts')}>
                <PermissionScopeRadio />
              </Field>
            </ListItem>
            <ListItem divider>
              <ListItemText primary="删除全部评论" />
              <Field name="thread.hidePosts" initialValue={getPermissionScopeValue(permissions, 'thread.hidePosts')}>
                <PermissionScopeRadio />
              </Field>
            </ListItem>
            <ListItem divider>
              <ListItemText primary="设置帖子评论功能开关" />
              <Field name="thread.disableThreadPosts" initialValue={getPermissionScopeValue(permissions, 'thread.disableThreadPosts')}>
                <PermissionScopeRadio />
              </Field>
            </ListItem>
            <ListItem divider>
              <ListItemText primary="帖子加精" />
              <Field name="thread.essence" initialValue={getPermissionScopeValue(permissions, 'thread.essence')}>
                <PermissionScopeRadio />
              </Field>
            </ListItem>
            <ListItem divider>
              <ListItemText primary="帖子置顶" />
              <Field name="thread.sticky" initialValue={getPermissionScopeValue(permissions, 'thread.sticky')}>
                <PermissionScopeRadio />
              </Field>
            </ListItem>
            <ListItem divider>
              <ListItemText primary="修改用户状态" secondary="可以在指定用户的详情页禁用用户" />
              <Field name="user.edit.status" initialValue={permissions.includes('user.edit.status')}>
                <PermissionScopeRadio isCategoryPermission={false} />
              </Field>
            </ListItem>
            <ListItem divider>
              <ListItemText primary="修改用户角色" secondary="可以在指定用户的详情页设置用户角色(包括设置用户为管理员)" />
              <Field name="user.edit.group" initialValue={permissions.includes('user.edit.group')}>
                <PermissionScopeRadio isCategoryPermission={false} />
              </Field>
            </ListItem>
            <ListItem>
              <ListItemText primary="修改用户基本信息" secondary="可以在指定用户的详情页修改用户基本信息，如昵称头像等" />
              <Field name="user.edit.base" initialValue={permissions.includes('user.edit.base')}>
                <PermissionScopeRadio isCategoryPermission={false} />
              </Field>
            </ListItem>
          </List>
        )}
      </Form>
      <Container sx={{ paddingTop: 2, paddingBottom: 2 }} maxWidth="xs">
        <DoTaskButton
          variant="contained"
          fullWidth
          failAlert
          task={async () => {
            await form.validateFields();
            const fieldsValue = form.getFieldsValue();
            const permissions = [] as PermissionType[];
            Object.keys(fieldsValue).forEach((key) => {
              const value = fieldsValue[key];
              if (Array.isArray(value)) {
                value.forEach((cId) => permissions.push(`category${cId}.${key}` as PermissionType));
              } else if (value) {
                permissions.push(key as PermissionType);
              }
            });
            await permissionApi.setPermissions(String(groupId), permissions);
            showSnackbar('保存成功');
            setTimeout(() => history.goBack(), 1000);
          }}
        >
          保存
        </DoTaskButton>
      </Container>
    </AppPage>
  );
};

export default PermissionPage;
