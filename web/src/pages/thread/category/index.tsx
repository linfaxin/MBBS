import React from 'react';
import { categoryApi } from '@/api';
import { history, useParams } from 'umi';
import { Box, Button, Card, Divider, Fab, Typography, useTheme } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { getResourceUrl } from '@/utils/resource-url';
import { useScreenWidthUpMD } from '@/utils/use-screen-width';
import ThreadList from '@/components/thread-list';
import AppLink from '@/components/app-link';
import MouseOverTip from '@/components/mouse-over-tip';
import AppPage from '@/components/app-page';
import { usePageState } from '@/utils/use-page-history-hooks';
import { CategoryLinked, getCategoryTotalThreadCount } from '@/api/category';
import showAlert from '@/utils/show-alert';
import MarkdownPreview from '@/components/vditor/markdown-preview';

export default function CategoryThreadsPage() {
  const params = useParams() as any;
  const categoryId = params.id;
  return <CategoryThreadsPageComponent key={categoryId} categoryId={categoryId} />;
}

function CategoryThreadsPageComponent(props: { categoryId: string | number }) {
  const { categoryId } = props;
  const isWidthUpDM = useScreenWidthUpMD();
  const theme = useTheme();
  const [category, setCategory] = usePageState<CategoryLinked>('category');

  return (
    <AppPage
      title={category?.name || ' '}
      parentPageCategoryId={category?.parent?.id}
      requestNavBackButton={!!category?.parent?.id}
      initPage={async () => {
        const c = await categoryApi.getCategory(categoryId);
        if (!c) throw new Error('未找到分类版块');
        setCategory(c);
      }}
      showInitPageLoading={!category}
    >
      <Card
        sx={{ background: theme.palette.background.paper }}
        elevation={isWidthUpDM ? undefined : 0}
        square={!isWidthUpDM}
        variant={isWidthUpDM ? 'outlined' : 'elevation'}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <img
            style={{ width: 88, height: 88, marginRight: 6, flex: 'none', cursor: 'pointer' }}
            src={getResourceUrl(category?.icon) || require('@/images/default-category.png')}
            onClick={() => {
              showAlert({
                title: '查看大图',
                message: (
                  <img style={{ width: '100%' }} src={getResourceUrl(category?.icon) || require('@/images/default-category.png')} alt="" />
                ),
              });
            }}
            alt="category"
          />
          <Box sx={{ wordBreak: 'break-all', paddingRight: 2 }}>
            <Typography component="div" variant="h6">
              {category?.name}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" component="div" fontSize="smaller">
              {category?.description || '（未设置分类版块描述）'}
            </Typography>
          </Box>
        </Box>
        {category?.children?.length > 0 && (
          <>
            <Divider orientation="horizontal" />
            <Box display="flex" flexWrap="wrap" alignItems="center" sx={{ pl: 1, pr: 1, pt: 0.5, pb: 0.5 }}>
              <Typography sx={{ fontSize: '13px', opacity: 0.7 }}>子板块</Typography>
              {category.children.map((c) => (
                <Button
                  size="small"
                  variant="outlined"
                  color="inherit"
                  sx={{ ml: 1, mt: 0.5, mb: 0.5, textAlign: 'left' }}
                  onClick={() => history.push(`/thread/category/${c.id}`)}
                >
                  {c.name}
                  <span style={{ opacity: 0.6 }}>({getCategoryTotalThreadCount(c)})</span>
                </Button>
              ))}
            </Box>
          </>
        )}
      </Card>
      {!isWidthUpDM && <Divider orientation="horizontal" />}
      {category?.home_ui_tip?.trim() && (
        <Box sx={{ display: 'flex', flexDirection: 'column', mt: 2, mb: 2 }}>
          <MarkdownPreview style={{ fontSize: 'inherit' }} markdown={category?.home_ui_tip} />
        </Box>
      )}
      {category && (
        <ThreadList
          queryParam={{ category_id: categoryId, sort: category.threads_default_sort }}
          filterableThreadTags={category.filter_thread_tags}
          style={{ marginTop: 16 }}
        />
      )}
      <MouseOverTip tip="发帖">
        <AppLink href={`/thread/add?category_id=${categoryId}`} sx={{ position: 'fixed', bottom: 20, right: 20 }}>
          <Fab color="primary" aria-label="add">
            <AddIcon />
          </Fab>
        </AppLink>
      </MouseOverTip>
    </AppPage>
  );
}
