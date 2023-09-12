import React, { ReactNode, useEffect, useLayoutEffect } from 'react';
import { Box, Button, CircularProgress, Typography, useTheme } from '@mui/material';
import { useModel } from 'umi';
import { useScreenWidthUpMD } from '@/utils/use-screen-width';
import { NavBarContent } from '@/models/useNavBarContent';
import { BoxProps } from '@mui/material/Box/Box';
import { categoryApi } from '@/api';
import { Breakpoint, SxProps } from '@mui/system';
import { Theme } from '@mui/material/styles';
import { useRequest, useUpdateEffect } from 'ahooks';
import { getPageStateWhenPop, setPageState } from '@/utils/use-page-history-hooks';

const AppPage: React.FC<
  {
    parentPage?: NavBarContent;
    parentPageCategoryId?: number | string;
    title?: string;
    requestNavBackButton?: boolean;
    navBarActionButton?: ReactNode;
    contentSx?: SxProps<Theme>;
    contentMaxWidth?: Breakpoint | false;
    initPage?: () => Promise<any>;
    showInitPageLoading?: boolean;
    reloadPageWhenLoginChange?: boolean;
  } & BoxProps
> = (props) => {
  const {
    parentPage,
    parentPageCategoryId,
    title = '',
    requestNavBackButton,
    navBarActionButton,
    contentSx,
    contentMaxWidth = 'md',
    initPage,
    showInitPageLoading = !!initPage,
    reloadPageWhenLoginChange = true,
    children,
    ...boxProps
  } = props;
  const theme = useTheme();
  const navBarContentModel = useModel('useNavBarContent');
  const { user: loginUser } = useModel('useLoginUser');
  const isWidthUpDM = useScreenWidthUpMD();
  const {
    loading: pageLoading,
    error: pageError,
    refresh: reloadPage,
  } = useRequest(async () => {
    if (initPage) await initPage();
  });

  useUpdateEffect(() => {
    if (reloadPageWhenLoginChange) {
      reloadPage();
    }
  }, [loginUser?.id]);

  useLayoutEffect(() => {
    // 页面初始化时 恢复滚动位置
    const scrollTop = getPageStateWhenPop('scrollTop') || 0;
    document.body.scrollTop = scrollTop;
    document.documentElement.scrollTop = scrollTop;

    const scrollListener = () => {
      setPageState('scrollTop', document.body.scrollTop || document.documentElement.scrollTop);
    };
    window.addEventListener('scroll', scrollListener);
    return () => window.removeEventListener('scroll', scrollListener);
  }, []);

  useEffect(() => {
    if (parentPageCategoryId) {
      categoryApi
        .listCategory()
        .then((list) => list.find((item) => String(item.id) == parentPageCategoryId))
        .then((category) => {
          navBarContentModel.setContent(
            category
              ? [
                  {
                    title: category.name,
                    href: `/thread/category/${category.id}`,
                  },
                  { title },
                ]
              : title,
          );
        });
    } else {
      navBarContentModel.setContent(parentPage ? [...parentPage, { title }] : title);
    }
  }, [title, parentPageCategoryId, JSON.stringify(parentPage)]);

  useEffect(() => {
    navBarContentModel.setActionBtn(navBarActionButton);
    return () => navBarContentModel.setActionBtn(null);
  }, [navBarActionButton]);

  useEffect(() => {
    if (requestNavBackButton) {
      navBarContentModel.setNavBackBtn(true);
      return () => navBarContentModel.setNavBackBtn(false);
    }
  }, []);

  return (
    <Box
      {...boxProps}
      sx={{
        minHeight: '100%',
        maxWidth: '100vw', // 避免移动端内容撑开 左右滚动
        paddingTop: isWidthUpDM ? 2 : 0,
        paddingBottom: isWidthUpDM ? 2 : 0,
        paddingLeft: isWidthUpDM ? 3 : 0,
        paddingRight: isWidthUpDM ? 3 : 0,
        boxSizing: 'border-box',
        overflowX: 'hidden',
        position: 'relative',
        color: theme.palette.text.primary,
        ...boxProps.sx,
      }}
    >
      <Box
        sx={{
          margin: 'auto',
          minWidth: '50vw', // 避免大屏窗口显示过小
          maxWidth: contentMaxWidth === false ? undefined : theme.breakpoints.values[contentMaxWidth],
          ...contentSx,
        }}
      >
        {pageError || (pageLoading && showInitPageLoading) ? (
          <Box sx={{ textAlign: 'center', marginTop: 4 }}>
            {pageError ? (
              <>
                <Typography>{pageError?.message || String(pageError)}</Typography>
                <Button onClick={reloadPage} sx={{ marginTop: 1 }}>
                  点击重试
                </Button>
              </>
            ) : (
              <CircularProgress />
            )}
          </Box>
        ) : (
          children
        )}
      </Box>
    </Box>
  );
};

export default AppPage;
