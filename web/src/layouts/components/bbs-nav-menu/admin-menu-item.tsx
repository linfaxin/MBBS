import React from 'react';
import { Divider, List, ListItemButton, ListItemText } from '@mui/material';
import GroupListItem from '@/components/group-list-item';
import { useModel } from 'umi';
import { GROUP_ID_ADMIN } from '@/consts';

const AdminMenuItem = (props: { jumpTo: (route: string) => void }) => {
  const { user } = useModel('useLoginUser');
  const { jumpTo } = props;
  const isAdmin = user?.username === 'admin' || user?.group?.id === GROUP_ID_ADMIN;
  if (!isAdmin) return null;
  return (
    <>
      <Divider />
      <GroupListItem text={<ListItemText primary="管理后台" secondary="仅系统管理员可见" />}>
        <List component="div" disablePadding>
          <ListItemButton onClick={() => jumpTo('/manage')}>
            <ListItemText primary="后台首页" />
          </ListItemButton>
          <GroupListItem text="论坛设置">
            <List component="div" disablePadding>
              <ListItemButton onClick={() => jumpTo('/manage/base')}>
                <ListItemText primary="基础设置" />
              </ListItemButton>
              <ListItemButton onClick={() => jumpTo('/manage/theme')}>
                <ListItemText primary="个性化设置" />
              </ListItemButton>
            </List>
          </GroupListItem>
          <GroupListItem text="内容管理">
            <ListItemButton onClick={() => jumpTo('/manage/category')}>
              <ListItemText primary="分类版块" />
            </ListItemButton>
            <ListItemButton onClick={() => jumpTo('/manage/thread')}>
              <ListItemText primary="帖子管理" />
            </ListItemButton>
            <ListItemButton onClick={() => jumpTo('/manage/thread-tag')}>
              <ListItemText primary="帖子标签管理" />
            </ListItemButton>
          </GroupListItem>
          <GroupListItem text="用户管理">
            <ListItemButton onClick={() => jumpTo('/manage/user')}>
              <ListItemText primary="用户管理" />
            </ListItemButton>
            <ListItemButton onClick={() => jumpTo('/manage/group')}>
              <ListItemText primary="角色权限" />
            </ListItemButton>
          </GroupListItem>
          <GroupListItem text="高级功能">
            <ListItemButton onClick={() => jumpTo('/manage/mail-config')}>
              <ListItemText primary="邮件设置" />
            </ListItemButton>
            <ListItemButton onClick={() => jumpTo('/manage/bind-host')}>
              <ListItemText primary="绑定域名" />
            </ListItemButton>
            <ListItemButton onClick={() => jumpTo('/manage/custom-html')}>
              <ListItemText primary="自定义HTML" />
            </ListItemButton>
            <ListItemButton onClick={() => jumpTo('/manage/export-db')}>
              <ListItemText primary="导出论坛数据" />
            </ListItemButton>
            <ListItemButton onClick={() => jumpTo('/manage/close-bbs')}>
              <ListItemText primary="关闭论坛" />
            </ListItemButton>
            <ListItemButton onClick={() => jumpTo('/manage/admin-token')}>
              <ListItemText primary="Admin Token" />
            </ListItemButton>
          </GroupListItem>
        </List>
      </GroupListItem>
    </>
  );
};

export default AdminMenuItem;
