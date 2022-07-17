import React, { useMemo } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useTheme } from '@mui/material';
import useBBSSetting from '@/models/useBBSSetting';

const CustomThemeWrapper: React.FC = (props) => {
  const bbsSetting = useBBSSetting();
  const theme = useTheme();

  const customTheme = useMemo(() => {
    if (!bbsSetting.ui_theme_primary_color && !bbsSetting.ui_theme_content_bg_color && !bbsSetting.ui_theme_dark_mode) {
      return theme;
    }
    return createTheme({
      palette: {
        mode: bbsSetting.ui_theme_dark_mode === '1' ? 'dark' : 'light',
        primary: {
          main: bbsSetting.ui_theme_primary_color || theme.palette.primary.main,
        },
        background: {
          default: bbsSetting.ui_theme_page_bg_color || theme.palette.background.default,
          paper:
            bbsSetting.ui_theme_content_bg_color || (bbsSetting.ui_theme_dark_mode === '1' ? '#2d2d2d' : theme.palette.background.paper),
        },
      },
    });
  }, [theme, bbsSetting.ui_theme_primary_color, bbsSetting.ui_theme_content_bg_color, bbsSetting.ui_theme_dark_mode]);

  return <ThemeProvider theme={customTheme}>{props.children}</ThemeProvider>;
};

export default CustomThemeWrapper;
