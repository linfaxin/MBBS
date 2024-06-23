import React from 'react';
import { getResourceUrl } from '@/utils/resource-url';
import { Box, Button, Divider, Typography, useTheme } from '@mui/material';
import OpenEditCategoryDialog from '@/pages/manage/category/components/open-edit-category-dialog';
import showSnackbar from '@/utils/show-snackbar';
import EditIcon from '@mui/icons-material/Edit';
import OpenPopupMarkdownEditor from '@/components/open-popup-markdown-editor';
import OpenAlertDialog from '@/components/open-alert-dialog';
import showAlert from '@/utils/show-alert';
import { CategoryLinked } from '@/api/category';
import { categoryApi } from '@/api';
import OpenEditFilterTagDialog from './open-edit-filter-tag-dialog';

const CategoryManageTreeItem = (props: {
  treeDeep?: number;
  category: CategoryLinked;
  categoriesLinked: CategoryLinked[];
  onCategoryChanged: () => void;
}) => {
  const theme = useTheme();
  const { treeDeep = 0, category, categoriesLinked, onCategoryChanged } = props;

  const treeDeepLeftPx = treeDeep * 16;
  return (
    <>
      <Box sx={{ pl: `${treeDeepLeftPx}px`, position: 'relative' }}>
        <Divider orientation="vertical" sx={{ position: 'absolute', ml: `${treeDeepLeftPx}px`, left: 0 }} />
        <Box sx={{ padding: 2, display: 'flex', background: theme.palette.background.paper }}>
          <img
            alt="icon"
            src={getResourceUrl(category.icon) || require('@/images/default-category.png')}
            style={{ width: 60, height: 60 }}
          />
          <Box sx={{ paddingLeft: 2, flex: 1 }}>
            <Typography>
              名称：{category.name}
              {category.hidden ? '（已隐藏）' : ''}
              {category.disable_post ? '（已关闭评论）' : ''}
            </Typography>
            <Typography>排序：{category.sort}</Typography>
            <Typography>描述：{category.description}</Typography>
          </Box>
        </Box>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'end',
            p: 1,
            background: theme.palette.background.paper,
          }}
        >
          <OpenAlertDialog
            message="确定删除这个分类版块吗？"
            cancelText="取消"
            onOk={async () => {
              try {
                await categoryApi.removeCategory(category.id);
                onCategoryChanged();
              } catch (e: any) {
                showAlert(e.message);
              }
            }}
          >
            <Button size="small" sx={{ mr: 1, mt: 1 }}>
              删除
            </Button>
          </OpenAlertDialog>
          <OpenEditCategoryDialog
            title="新增子版块"
            categories={categoriesLinked}
            parentCategoryId={category.id}
            doSubmitCategory={async (fields) => {
              await categoryApi.addCategory(fields);
              onCategoryChanged();
              showSnackbar('新增成功');
            }}
          >
            <Button variant="contained" size="small" sx={{ mr: 1, mt: 1 }}>
              新增子版块
            </Button>
          </OpenEditCategoryDialog>
          <OpenPopupMarkdownEditor
            title="自定义版块页提示"
            defaultValue={category.home_ui_tip || ''}
            placeholder="会展示在版块的首页，可以自定义一些提示文案"
            onSubmitFailAlert
            onSubmit={async (inputValue) => {
              await categoryApi.setCategoryHomeUITip(category.id, inputValue);
              onCategoryChanged();
              showSnackbar('设置成功');
            }}
          >
            <Button variant="contained" size="small" sx={{ mr: 1, mt: 1 }}>
              设置版块页文案
            </Button>
          </OpenPopupMarkdownEditor>
          <OpenEditFilterTagDialog
            title="设置版块筛选标签"
            category={category}
            onChanged={() => {
              onCategoryChanged();
              showSnackbar('设置成功');
            }}
          >
            <Button variant="contained" size="small" sx={{ mr: 1, mt: 1 }}>
              设置筛选标签
            </Button>
          </OpenEditFilterTagDialog>
          <OpenPopupMarkdownEditor
            title="设置发帖默认模版"
            defaultValue={category.create_thread_template || ''}
            placeholder="在版块发帖时，默认会使用该模版的内容做为编辑初始内容"
            onSubmitFailAlert
            onSubmit={async (inputValue) => {
              await categoryApi.setCategoryCreateThreadTemplate(category.id, { template: inputValue });
              onCategoryChanged();
              showSnackbar('设置成功');
            }}
          >
            <Button variant="contained" size="small" sx={{ mr: 1, mt: 1 }}>
              设置发帖模版
            </Button>
          </OpenPopupMarkdownEditor>
          <OpenEditCategoryDialog
            title="修改分类版块信息"
            category={category}
            categories={categoriesLinked}
            doSubmitCategory={async (fields) => {
              await categoryApi.setCategory(category.id, fields);
              onCategoryChanged();
              showSnackbar('修改成功');
            }}
          >
            <Button startIcon={<EditIcon />} variant="contained" size="small" sx={{ mr: 1, mt: 1 }}>
              基本信息
            </Button>
          </OpenEditCategoryDialog>
        </Box>
      </Box>
      <Divider orientation="horizontal" sx={{ ml: `${treeDeepLeftPx}px` }} />
      {(category.children || []).map((subCategory) => (
        <CategoryManageTreeItem
          key={subCategory.id}
          treeDeep={treeDeep + 1}
          category={subCategory}
          categoriesLinked={categoriesLinked}
          onCategoryChanged={onCategoryChanged}
        />
      ))}
      {(category.children || []).length > 0 && <Box sx={{ height: '12px' }} />}
    </>
  );
};

export default CategoryManageTreeItem;
