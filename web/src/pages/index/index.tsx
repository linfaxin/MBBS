import React from 'react';
import { Box, Card, Divider, Grid, Typography } from '@mui/material';
import { useModel } from 'umi';
import { getResourceUrl } from '@/utils/resource-url';
import PaperClickable from '@/components/paper-clickable';
import PowerBy from '@/components/power-by';
import { useScreenWidthUpMD, useScreenWidthUpSM } from '@/utils/use-screen-width';
import AppLink from '@/components/app-link';
import AppPage from '@/components/app-page';
import MarkdownPreview from '@/components/vditor/markdown-preview';

export default function IndexPage() {
  const widthUpMD = useScreenWidthUpMD();
  const widthUpSM = useScreenWidthUpSM();
  const bbsSetting = useModel('useBBSSetting');
  const { categoriesSorted, reloadCategory } = useModel('useCategories');

  return (
    <AppPage contentSx={{ padding: 2 }} initPage={reloadCategory} showInitPageLoading={!categoriesSorted || categoriesSorted.length === 0}>
      {bbsSetting.ui_tip_home_page?.trim() && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
          <MarkdownPreview style={{ fontSize: 'inherit' }} markdown={bbsSetting.ui_tip_home_page} />
        </Box>
      )}
      <Typography sx={{ fontSize: 'smaller', opacity: 0.5, textAlign: 'center' }}>选择一个分类版块进入</Typography>
      <Grid container spacing={{ xs: 2, sm: 2 }} columns={12} sx={{ paddingTop: 2 }}>
        {(categoriesSorted || []).map((category) => (
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
                        帖子数：{category.thread_count || 0}
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
