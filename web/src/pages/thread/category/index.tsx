import React from 'react';
import { categoryApi } from '@/api';
import { useParams } from 'umi';
import { Box, Card, Divider, Fab, Typography, useTheme } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { getResourceUrl } from '@/utils/resource-url';
import { useScreenWidthUpMD } from '@/utils/use-screen-width';
import ThreadList from '@/components/thread-list';
import AppLink from '@/components/app-link';
import MouseOverTip from '@/components/mouse-over-tip';
import AppPage from '@/components/app-page';
import { usePageState } from '@/utils/use-page-history-hooks';
import { Category } from '@/api/category';
import showAlert from '@/utils/show-alert';

export default function CategoryThreadsPage() {
  const params = useParams() as any;
  const categoryId = params.id;
  return <CategoryThreadsPageComponent key={categoryId} categoryId={categoryId} />;
}

function CategoryThreadsPageComponent(props: { categoryId: string | number }) {
  const { categoryId } = props;
  const isWidthUpDM = useScreenWidthUpMD();
  const theme = useTheme();
  const [category, setCategory] = usePageState<Category>('category');

  return (
    <AppPage
      title={category?.name || ' '}
      initPage={async () => {
        const c = await categoryApi.getCategory(categoryId);
        if (!c) throw new Error('未找到分类版块');
        setCategory(c);
      }}
      showInitPageLoading={!category}
    >
      <Card
        sx={{ display: 'flex', alignItems: 'center', background: theme.palette.background.paper }}
        elevation={isWidthUpDM ? undefined : 0}
        square={!isWidthUpDM}
        variant={isWidthUpDM ? 'outlined' : 'elevation'}
      >
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
      </Card>
      {!isWidthUpDM && <Divider orientation="horizontal" />}
      <ThreadList queryParam={{ category_id: categoryId }} style={{ marginTop: 16 }} />
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
