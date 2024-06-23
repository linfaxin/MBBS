import React, { useMemo } from 'react';
import { Box, Button, Container } from '@mui/material';
import { categoryApi } from '@/api';
import { useModel } from 'umi';
import { useRequest } from 'ahooks';
import AddIcon from '@mui/icons-material/Add';
import OpenEditCategoryDialog from '@/pages/manage/category/components/open-edit-category-dialog';
import showSnackbar from '@/utils/show-snackbar';
import AppPage from '@/components/app-page';
import CategoryManageTreeItem from '@/pages/manage/category/components/category-manage-tree-item';

const ManageCategory = () => {
  const { reloadCategory } = useModel('useCategories');
  const { data: categories, refresh } = useRequest(() => categoryApi.listAllCategoryWithHidden());
  const categoryTreeRoot = useMemo(() => categories?.filter((c) => !c.parent) || [], [categories]);

  return (
    <AppPage title="分类版块设置" parentPage={[{ title: '管理后台', href: '/manage' }]}>
      <Box>
        {categoryTreeRoot.map((category, index) => (
          <CategoryManageTreeItem
            key={index}
            category={category}
            categoriesLinked={categories || []}
            onCategoryChanged={() => {
              refresh();
              reloadCategory();
            }}
          />
        ))}
      </Box>
      <Container sx={{ paddingTop: 2, paddingBottom: 2 }} maxWidth="xs">
        <OpenEditCategoryDialog
          title="新增分类版块"
          categories={categories || []}
          doSubmitCategory={async (fields) => {
            await categoryApi.addCategory(fields);
            refresh();
            showSnackbar('新增成功');
          }}
        >
          <Button startIcon={<AddIcon />} variant="contained" fullWidth>
            新增分类版块
          </Button>
        </OpenEditCategoryDialog>
      </Container>
    </AppPage>
  );
};

export default ManageCategory;
