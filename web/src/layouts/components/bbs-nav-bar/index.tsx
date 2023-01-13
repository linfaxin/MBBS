import React, { useState } from 'react';
import { Link, useModel } from 'umi';
import { AppBar, Breadcrumbs, Button, Drawer, IconButton, Toolbar, Typography, useTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import HideOnScroll from '@/components/hide-on-scroll';
import { useScreenWidthUpMD } from '@/utils/use-screen-width';
import BBSNavMenu from '@/layouts/components/bbs-nav-menu';
import { getResourceUrl } from '@/utils/resource-url';
import AppLink from '@/components/app-link';
import styles from './index.less';
import showLoginDialog from '@/utils/show-login-dialog';
import { isHashHistoryRootPage } from '@/utils/use-page-history-hooks';
import ApiUI from '@/api-ui';

const BBSNavBar: React.FC = (props) => {
  const navBarContentModel = useModel('useNavBarContent');
  const bbsSetting = useModel('useBBSSetting');
  const { user: loginUser } = useModel('useLoginUser');
  const theme = useTheme();
  const [menuVisible, setMenuVisible] = useState(false);
  const widthUpMD = useScreenWidthUpMD();

  const appBarContent = (
    <AppBar
      sx={{
        background: theme.palette.mode === 'dark' ? theme.palette.background.paper : undefined,
        backgroundImage: bbsSetting.ui_nav_bar_bg_image ? `url(${getResourceUrl(bbsSetting.ui_nav_bar_bg_image)})` : undefined,
        backgroundRepeat: 'no-repeat',
        backgroundSize: '100% 100%',
      }}
    >
      <Toolbar>
        {!ApiUI.hideSlideMenu &&
          !widthUpMD &&
          (navBarContentModel.navBackBtn && history.length > 1 && !isHashHistoryRootPage() ? (
            <IconButton size="large" edge="start" color="inherit" aria-label="back" onClick={() => history.back()}>
              <ArrowBackIosIcon />
            </IconButton>
          ) : (
            <IconButton size="large" edge="start" color="inherit" aria-label="menu" onClick={() => setMenuVisible(!menuVisible)}>
              <MenuIcon />
            </IconButton>
          ))}
        {widthUpMD && (
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <img
              alt="logo"
              src={getResourceUrl(bbsSetting.logo) || require('@/images/default-logo.png')}
              style={{ width: 40, height: 40 }}
            />
            <Typography
              variant="h6"
              sx={{
                paddingLeft: 2,
                paddingRight: 4,
                maxWidth: '10.4em',
                lineHeight: 1.2,
                maxHeight: '2.4em',
                overflow: 'hidden',
              }}
            >
              {bbsSetting.site_name || '(未设置论坛名称)'}
            </Typography>
          </Link>
        )}
        <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
          {widthUpMD ? (
            <Breadcrumbs aria-label="breadcrumb" color="inherit" className={styles.breadcrumb}>
              {navBarContentModel.content.map((item, i) => (
                <Typography
                  key={i}
                  sx={{
                    opacity: i === navBarContentModel.content.length - 1 ? 1 : 0.8,
                  }}
                >
                  {item.href ? (
                    <AppLink href={item.href} underline="hover">
                      {item.title}
                    </AppLink>
                  ) : (
                    item.title
                  )}
                </Typography>
              ))}
            </Breadcrumbs>
          ) : (
            <div style={{ maxHeight: '2.4em', lineHeight: 1.2, overflow: 'hidden' }}>
              {navBarContentModel.getLastItemTitle() || bbsSetting.site_name}
            </div>
          )}
        </Typography>
        {!loginUser && (
          <Button color="inherit" size="large" sx={{ marginRight: -1 }} onClick={() => showLoginDialog()}>
            登录
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );

  return (
    <>
      {widthUpMD ? appBarContent : <HideOnScroll>{appBarContent}</HideOnScroll>}
      <Toolbar /> {/* placeholder */}
      {!ApiUI.hideSlideMenu && (
        <Drawer anchor="left" open={menuVisible && !widthUpMD} onClose={() => setMenuVisible(false)}>
          <BBSNavMenu onMenuJump={() => setMenuVisible(false)} />
        </Drawer>
      )}
    </>
  );
};

export default BBSNavBar;
