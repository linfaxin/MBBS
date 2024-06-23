import React, { useMemo } from 'react';
import { Box, Card, Divider, Grid, IconButton, MenuItem, Select, Typography } from '@mui/material';
import { useModel, history } from 'umi';
import SearchIcon from '@mui/icons-material/Search';
import { getResourceUrl } from '@/utils/resource-url';
import PaperClickable from '@/components/paper-clickable';
import PowerBy from '@/components/power-by';
import { useScreenWidthUpMD, useScreenWidthUpSM } from '@/utils/use-screen-width';
import AppLink from '@/components/app-link';
import AppPage from '@/components/app-page';
import MarkdownPreview from '@/components/vditor/markdown-preview';
import showPromptDialog from '@/utils/show-prompt-dialog';
import style from '@/components/thread-list/index.less';
import { getCategoryTotalThreadCount } from '@/api/category';

export default function IndexPage() {
  const widthUpMD = useScreenWidthUpMD();
  const widthUpSM = useScreenWidthUpSM();
  const bbsSetting = useModel('useBBSSetting');
  const { categoriesSorted, reloadCategory } = useModel('useCategories');
  const categoryRootItems = useMemo(() => categoriesSorted?.filter((c) => !c.parent), [categoriesSorted]);

  return (
    <AppPage
      contentSx={{ padding: 2 }}
      navBarActionButton={
        <IconButton
          color="inherit"
          size="large"
          sx={{ marginRight: -1 }}
          onClick={() => {
            let searchType = 'thread';
            showPromptDialog({
              title: '全站搜索',
              inputLabel: '搜索关键字',
              TextFieldProps: {
                InputProps: {
                  startAdornment: (
                    <Select
                      size="small"
                      className={style.sort_select_button}
                      sx={{ fontSize: 'smaller', pt: '5px', height: '32px' }}
                      defaultValue={searchType}
                      onChange={(e) => (searchType = e.target.value as string)}
                    >
                      <MenuItem value="thread">帖子</MenuItem>
                      <MenuItem value="user">用户</MenuItem>
                    </Select>
                  ),
                },
              },
              onSubmit: (input) => {
                if (searchType === 'thread') {
                  history.push(`/thread/search?keywords=${encodeURIComponent(input || '')}`);
                } else if (searchType === 'user') {
                  history.push(`/user/search?keywords=${encodeURIComponent(input || '')}`);
                }
              },
            });
          }}
        >
          <SearchIcon />
        </IconButton>
      }
      initPage={async () => {
        const categories = await reloadCategory();
        if (bbsSetting.site_home_page_show_category) {
          // 首页直接显示目标板块
          const redirectToCategory = categories.find((c) => String(c.id) === bbsSetting.site_home_page_show_category);
          if (redirectToCategory) {
            history.replace(`/thread/category/${redirectToCategory.id}`);
            await new Promise((resolve) => {});
          }
        }
      }}
      showInitPageLoading={!!bbsSetting.site_home_page_show_category || !categoriesSorted || categoriesSorted.length === 0}
    >
      {bbsSetting.ui_tip_home_page?.trim() ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
          <MarkdownPreview style={{ fontSize: 'inherit' }} markdown={bbsSetting.ui_tip_home_page} />
        </Box>
      ) : (
        <Typography sx={{ fontSize: 'smaller', opacity: 0.5, textAlign: 'center' }}>选择一个分类版块进入</Typography>
      )}
      <Grid container spacing={{ xs: 2, sm: 2 }} columns={12} sx={{ paddingTop: 2 }}>
        {(categoryRootItems || []).map((category) => (
          <Grid item xs={12} sm={6} key={category.id}>
            <AppLink href={`/thread/category/${category.id}`} sx={{ width: '100%' }}>
              <PaperClickable>
                <Card variant="outlined" sx={{ height: widthUpSM ? '100%' : undefined }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <img
                      style={{ width: 100, height: 100, marginRight: 6, flex: 'none' }}
                      src={getResourceUrl(category.icon) || require('@/images/default-category.png')}
                      alt="category"
                    />
                    <Box sx={{ wordBreak: 'break-all', paddingRight: 2 }}>
                      <Typography component="div" variant="h6">
                        {category.name}
                      </Typography>
                      <Typography variant="subtitle1" color="text.secondary" component="div" fontSize="smaller">
                        帖子数：{getCategoryTotalThreadCount(category)}
                      </Typography>
                    </Box>
                  </Box>
                  <Divider orientation="horizontal" />
                  <Typography variant="subtitle1" color="text.secondary" component="div" fontSize="smaller" sx={{ padding: 2 }}>
                    {category.description || '（未设置分类版块描述）'}
                  </Typography>
                </Card>
              </PaperClickable>
            </AppLink>
          </Grid>
        ))}
      </Grid>
      {!widthUpMD && <PowerBy />}
    </AppPage>
  );
}
