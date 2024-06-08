import React from 'react';
import { Box, Button, Container, Divider, Typography, useTheme } from '@mui/material';
import { categoryApi } from '@/api';
import { useModel } from 'umi';
import { useRequest } from 'ahooks';
import { getResourceUrl } from '@/utils/resource-url';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import OpenAlertDialog from '@/components/open-alert-dialog';
import OpenEditCategoryDialog from '@/pages/manage/category/components/open-edit-category-dialog';
import showSnackbar from '@/utils/show-snackbar';
import AppPage from '@/components/app-page';
import showAlert from '@/utils/show-alert';
import OpenPopupMarkdownEditor from '@/components/open-popup-markdown-editor';

const ManageCategory = () => {
  const { reloadCategory } = useModel('useCategories');
  const { data: categories, refresh } = useRequest(() =>
    categoryApi.listAllCategoryWithHidden().then((list) => [...list].sort((a, b) => a.sort - b.sort)),
  );
  const theme = useTheme();

  return (
    <AppPage title="分类版块设置" parentPage={[{ title: '管理后台', href: '/manage' }]}>
      <Box sx={{ background: theme.palette.background.paper }}>
        {(categories || []).map((category, index) => (
          <React.Fragment key={index}>
            <Box sx={{ padding: 2, display: 'flex' }}>
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
              <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <OpenEditCategoryDialog
                  title="修改分类版块"
                  category={category}
                  doSubmitCategory={async (fields) => {
                    await categoryApi.setCategory(category.id, fields);
                    refresh();
                    reloadCategory(); // 更新其他地方展示的菜单
                    showSnackbar('修改成功');
                  }}
                >
                  <Button startIcon={<EditIcon />} variant="contained" fullWidth size="small">
                    修改
                  </Button>
                </OpenEditCategoryDialog>
                <OpenPopupMarkdownEditor
                  title="自定义板块页文案"
                  defaultValue={category.home_ui_tip || ''}
                  placeholder="会展示在板块的首页，可以自定义一些提示文案"
                  onSubmitFailAlert
                  onSubmit={async (inputValue) => {
                    await categoryApi.setCategoryHomeUITip(category.id, inputValue);
                    reloadCategory(); // 更新其他地方展示的菜单
                    showSnackbar('设置成功');
                  }}
                >
                  <Button variant="contained" fullWidth size="small" sx={{ marginTop: 1 }}>
                    自定义板块页文案
                  </Button>
                </OpenPopupMarkdownEditor>
                <OpenPopupMarkdownEditor
                  title="设置发帖默认模版"
                  defaultValue={category.create_thread_template || ''}
                  placeholder="在板块发帖时，默认会使用该模版的内容做为编辑初始内容"
                  onSubmitFailAlert
                  onSubmit={async (inputValue) => {
                    await categoryApi.setCategoryCreateThreadTemplate(category.id, { template: inputValue });
                    reloadCategory(); // 更新其他地方展示的菜单
                    showSnackbar('设置成功');
                  }}
                >
                  <Button variant="contained" fullWidth size="small" sx={{ marginTop: 1 }}>
                    设置发帖模版
                  </Button>
                </OpenPopupMarkdownEditor>
                <OpenAlertDialog
                  message="确定删除这个分类版块吗？"
                  cancelText="取消"
                  onOk={async () => {
                    try {
                      await categoryApi.removeCategory(category.id);
                      refresh();
                    } catch (e: any) {
                      showAlert(e.message);
                    }
                  }}
                >
                  <Button fullWidth size="small" sx={{ marginTop: 1 }}>
                    删除
                  </Button>
                </OpenAlertDialog>
              </Box>
            </Box>
            {index < (categories || []).length - 1 && <Divider orientation="horizontal" />}
          </React.Fragment>
        ))}
      </Box>
      <Container sx={{ paddingTop: 2, paddingBottom: 2 }} maxWidth="xs">
        <OpenEditCategoryDialog
          title="新增分类版块"
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
