import { PropsWithChildren, useEffect } from 'react';
import { Box, useTheme } from '@mui/material';
import { useModel } from 'umi';
import { useScreenWidthUpMD } from '@/utils/use-screen-width';
import BBSNavMenu from '@/layouts/components/bbs-nav-menu';
import BBSNavBar from '@/layouts/components/bbs-nav-bar';
import ApiUI from '@/api-ui';
import './index.less';

export default function (props: PropsWithChildren<{}>) {
  const theme = useTheme();
  const widthUpMD = useScreenWidthUpMD();
  const showTopBar = !ApiUI.hideTopBar;
  const bbsSetting = useModel('useBBSSetting');

  useEffect(() => {
    if (bbsSetting.ui_theme_page_bg_color) {
      document.body.style.background = bbsSetting.ui_theme_page_bg_color;
    } else {
      document.body.style.background = theme.palette.mode === 'dark' ? theme.palette.grey['900'] : theme.palette.grey['100'];
    }
  }, [theme.palette.mode, bbsSetting.ui_theme_page_bg_color]);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      {showTopBar && <BBSNavBar />}
      <Box sx={{ display: 'flex', flexGrow: 1 }}>
        {widthUpMD && !ApiUI.hideSlideMenu && (
          <>
            <BBSNavMenu
              sx={{
                width: 240,
                position: 'fixed',
                overflow: 'auto',
                bottom: 0,
                top: showTopBar ? 64 : 0,
                background: theme.palette.background.paper,
                borderRight: 1,
                borderColor: theme.palette.divider,
                boxSizing: 'border-box',
              }}
              className="slide-nav-menu"
            />
            <div style={{ width: 240, flex: 'none' }} />
          </>
        )}
        <Box sx={{ flex: 1, position: 'relative' }}>{props.children}</Box>
      </Box>
    </Box>
  );
}
