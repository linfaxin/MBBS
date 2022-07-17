import React from 'react';
import { Divider, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Theme, useTheme } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import CategoryIcon from '@mui/icons-material/Category';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { SxProps } from '@mui/system';
import { history, useModel } from 'umi';
import AdminMenuItem from '@/layouts/components/bbs-nav-menu/admin-menu-item';
import PowerBy from '@/components/power-by';
import BBSInfo from '@/layouts/components/bbs-nav-menu/bbs-info';
import GroupListItem from '@/components/group-list-item';
import { getResourceUrl } from '@/utils/resource-url';

const BBSNavMenu: React.FC<{
  onMenuJump?: () => void;
  sx?: SxProps<Theme>;
  className?: string;
}> = (props) => {
  const { user, refreshUser } = useModel('useLoginUser');
  const { categoriesSorted } = useModel('useCategories');
  const bbsSetting = useModel('useBBSSetting');
  const theme = useTheme();
  const { onMenuJump, sx, className } = props;
  const { width = 240 } = sx || ({} as any);

  const jumpTo = (route: string) => {
    history.push(route);
    if (onMenuJump) {
      onMenuJump();
    }
  };
  return (
    <List
      sx={{
        ...sx,
        width: width as any,
        color: theme.palette.text.primary,
        backgroundImage: bbsSetting.ui_nav_menu_bg_image ? `url(${getResourceUrl(bbsSetting.ui_nav_menu_bg_image)})` : undefined,
        backgroundRepeat: 'no-repeat',
        backgroundSize: '100% 100%',
      }}
      className={className}
    >
      <ListItem button onClick={() => jumpTo('/')}>
        <ListItemIcon>
          <HomeIcon />
        </ListItemIcon>
        <ListItemText primary="首页" />
      </ListItem>
      <GroupListItem text="分类版块" icon={<CategoryIcon />} defaultOpen>
        <List component="div" disablePadding>
          {categoriesSorted?.map((c) => (
            <ListItemButton key={c.id} onClick={() => jumpTo(`/thread/category/${c.id}`)}>
              <ListItemText primary={c.name} />
              <span style={{ opacity: 0.5 }}>{c.thread_count || 0}</span>
            </ListItemButton>
          ))}
        </List>
      </GroupListItem>
      <GroupListItem
        text="个人中心"
        icon={<AccountCircleIcon />}
        onOpenChanged={(open) => {
          if (open) refreshUser();
        }}
      >
        <List component="div" disablePadding>
          <ListItemButton onClick={() => jumpTo('/personal-center')}>
            <ListItemText primary="个人信息" />
          </ListItemButton>
          {user && (
            <ListItemButton onClick={() => jumpTo(`/user/threads?id=${user.id}`)}>
              <ListItemText primary="我的帖子" />
              <span style={{ opacity: 0.5 }}>{user.thread_count || 0}</span>
            </ListItemButton>
          )}
          {user && (
            <ListItemButton onClick={() => jumpTo(`/user/posts?id=${user.id}`)}>
              <ListItemText primary="我的评论" />
              <span style={{ opacity: 0.5 }}>{user.post_count || 0}</span>
            </ListItemButton>
          )}
        </List>
      </GroupListItem>
      <AdminMenuItem jumpTo={jumpTo} />
      <Divider />
      <BBSInfo />
      <Divider />
      <PowerBy />
    </List>
  );
};

export default BBSNavMenu;
