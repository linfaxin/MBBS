import React, { useEffect } from 'react';
import Form, { Field, useForm } from 'rc-field-form';
import { Box, Button, Grid, MenuItem, TextField, useTheme } from '@mui/material';
import { categoryApi, threadApi } from '@/api';
import { history } from 'umi';
import { useRequest } from 'ahooks';
import { usePageState } from '@/utils/use-page-history-hooks';
import AppPage from '@/components/app-page';
import { ThreadIsApproved } from '@/api/thread';
import ThreadList from '@/components/thread-list';
import OpenAlertDialog from '@/components/open-alert-dialog';
import showAlert from '@/utils/show-alert';
import OpenSetApprovedDialog from '@/pages/manage/thread/components/open-set-approved-dialog';

const ManageThreads = () => {
  const theme = useTheme();
  const [filterValues, setFilterValues] = usePageState<any>('filterValues');
  const { data: categories } = useRequest(() => categoryApi.listCategorySorted());
  const [form] = useForm();
  useEffect(() => {
    let defaultFilter: any = history.location.query || {};
    if (filterValues) {
      // 初始化后就有默认值：从历史记录恢复
      form.setFieldsValue(filterValues);
    } else if (Object.keys(defaultFilter).length) {
      if (typeof defaultFilter.status === 'string') {
        defaultFilter = {
          ...defaultFilter,
          status: defaultFilter.status?.split(','),
        };
      }
      if (typeof defaultFilter.group_id === 'string') {
        defaultFilter = {
          ...defaultFilter,
          group_id: defaultFilter.group_id?.split(','),
        };
      }
      if (typeof defaultFilter.is_approved === 'string') {
        defaultFilter = {
          ...defaultFilter,
          is_approved: defaultFilter.is_approved
            ?.split(',')
            .map((s: string) => parseInt(s))
            .filter((n: number) => !isNaN(n)),
        };
      }
      form.setFieldsValue(defaultFilter);
      setFilterValues(defaultFilter);
    }
  }, []);

  return (
    <AppPage title="帖子管理" parentPage={[{ title: '管理后台', href: '/manage' }]} sx={{ paddingTop: 0 }}>
      <Form
        style={{
          background: theme.palette.background.paper,
          padding: 16,
          marginBottom: 16,
          position: 'relative',
        }}
        form={form}
        onFinish={() => setFilterValues({ ...form.getFieldsValue() })}
      >
        <Box
          sx={{
            position: 'absolute',
            left: '-50vw',
            right: '-50vw',
            top: 0,
            bottom: 0,
            background: theme.palette.background.paper,
          }}
        />
        <Grid container spacing={{ xs: 2, sm: 2, md: 2 }} columns={12}>
          <Grid item xs={6} sm={6} md={4}>
            <Field name="thread_id" initialValue="">
              <TextField label="帖子ID" variant="outlined" fullWidth size="small" type="number" />
            </Field>
          </Grid>
          <Grid item xs={6} sm={6} md={4}>
            <Field name="user_id" initialValue="">
              <TextField label="用户ID" variant="outlined" fullWidth size="small" />
            </Field>
          </Grid>
          <Grid item xs={6} sm={6} md={4}>
            <Field name="category_id" initialValue="">
              <TextField label="分类版块" variant="outlined" fullWidth size="small" select>
                {(categories || []).map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
            </Field>
          </Grid>
          <Grid item xs={6} sm={6} md={4}>
            <Field name="is_approved" initialValue={[ThreadIsApproved.ok]}>
              <TextField label="审核状态" variant="outlined" fullWidth size="small" select SelectProps={{ multiple: true }}>
                <MenuItem value={ThreadIsApproved.checking}>审核中</MenuItem>
                <MenuItem value={ThreadIsApproved.ok}>正常(审核通过)</MenuItem>
                <MenuItem value={ThreadIsApproved.check_failed}>审核不通过</MenuItem>
              </TextField>
            </Field>
          </Grid>
          <Grid item xs={6} sm={6} md={4}>
            <Field name="is_sticky" initialValue="">
              <TextField label="是否置顶" variant="outlined" fullWidth size="small" select>
                <MenuItem value="">全部</MenuItem>
                <MenuItem value="1">是</MenuItem>
                <MenuItem value="0">否</MenuItem>
              </TextField>
            </Field>
          </Grid>
          <Grid item xs={6} sm={6} md={4}>
            <Field name="is_essence" initialValue="">
              <TextField label="是否精华" variant="outlined" fullWidth size="small" select>
                <MenuItem value="">全部</MenuItem>
                <MenuItem value="1">是</MenuItem>
                <MenuItem value="0">否</MenuItem>
              </TextField>
            </Field>
          </Grid>
          <Grid item xs={6} sm={6} md={4}>
            <Field name="is_deleted" initialValue="0">
              <TextField label="已删除" variant="outlined" fullWidth size="small" select>
                <MenuItem value="1">是</MenuItem>
                <MenuItem value="0">否</MenuItem>
              </TextField>
            </Field>
          </Grid>
          <Grid item xs={6} sm={6} md={4} sx={{ display: 'flex', alignItems: 'center' }}>
            <Button variant="contained" onClick={() => form.submit()}>
              搜索帖子
            </Button>
          </Grid>
        </Grid>
      </Form>
      {filterValues && (
        <ThreadList
          listReloadKey={filterValues}
          queryParam={{
            ...filterValues,
            is_sticky: filterValues.is_sticky === '1' ? true : filterValues.is_sticky === '0' ? false : undefined,
            is_essence: filterValues.is_essence === '1' ? true : filterValues.is_essence === '0' ? false : undefined,
            is_deleted: filterValues.is_deleted === '1' ? true : filterValues.is_deleted === '0' ? false : undefined,
          }}
          onClickThread={(thread) => history.push(`/thread/detail/${thread.id}?isAdmin=1`)}
          renderActions={(thread, reRender) => (
            <>
              {!thread.deleted_at ? (
                <OpenAlertDialog
                  message="确定删除吗?"
                  cancelText="取消"
                  onOk={async () => {
                    try {
                      await threadApi.deleteThread(thread.id);
                      thread.deleted_at = new Date().toJSON();
                      reRender();
                    } catch (e: any) {
                      showAlert(e.message);
                    }
                  }}
                >
                  <Button>删除</Button>
                </OpenAlertDialog>
              ) : (
                <OpenAlertDialog
                  title="撤销删除"
                  message="确定撤销删除吗?"
                  cancelText="取消"
                  onOk={async () => {
                    try {
                      await threadApi.restoreDeleteThread(thread.id);
                      thread.deleted_at = null;
                      reRender();
                    } catch (e: any) {
                      showAlert(e.message);
                    }
                  }}
                >
                  <Button>撤销删除</Button>
                </OpenAlertDialog>
              )}
              <OpenSetApprovedDialog
                thread={thread}
                onThreadChange={(newThread) => {
                  Object.assign(thread, newThread);
                  reRender();
                }}
              />
            </>
          )}
        />
      )}
    </AppPage>
  );
};

export default ManageThreads;
