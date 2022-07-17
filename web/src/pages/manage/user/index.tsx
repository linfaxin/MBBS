import React, { useEffect } from 'react';
import Form, { Field, useForm } from 'rc-field-form';
import { Box, Button, Divider, Grid, List, MenuItem, TextField, useTheme } from '@mui/material';
import AppPageList from '@/components/app-page-list';
import { groupApi, userApi } from '@/api';
import { User, UserStatus } from '@/api/base/user';
import { history } from 'umi';
import { ENUM_MAP_USER_STATE } from '@/consts';
import { useRequest } from 'ahooks';
import UserItem from '@/pages/manage/user/components/user-item';
import { getPageStateWhenPop, setPageState, usePageState } from '@/utils/use-page-history-hooks';
import AppPage from '@/components/app-page';

const ManageUser = () => {
  const theme = useTheme();
  const [filterValues, setFilterValues] = usePageState<any>('filterValues');
  const [userList, setUserList] = usePageState<User[]>('userList', []);
  const { data: groups } = useRequest(() => groupApi.listGroup());
  const [form] = useForm();
  useEffect(() => {
    let defaultFilter = history.location.query || {};
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
      form.setFieldsValue(defaultFilter);
      setFilterValues(defaultFilter);
    }
  }, []);

  return (
    <AppPage title="用户管理" parentPage={[{ title: '管理后台', href: '/manage' }]} sx={{ paddingTop: 0 }}>
      <Form
        style={{
          background: theme.palette.background.paper,
          padding: 16,
          marginBottom: 16,
          position: 'relative',
        }}
        form={form}
        onFinish={() => {
          setUserList([]);
          setFilterValues({ ...form.getFieldsValue() });
        }}
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
            <Field name="user_id" initialValue="">
              <TextField label="用户ID" variant="outlined" fullWidth size="small" type="number" />
            </Field>
          </Grid>
          <Grid item xs={6} sm={6} md={4}>
            <Field name="username" initialValue="">
              <TextField label="用户账号" variant="outlined" fullWidth size="small" />
            </Field>
          </Grid>
          <Grid item xs={6} sm={6} md={4}>
            <Field name="nickname" initialValue="">
              <TextField label="昵称" variant="outlined" fullWidth size="small" />
            </Field>
          </Grid>
          <Grid item xs={6} sm={6} md={4}>
            <Field name="group_id" initialValue={[]}>
              <TextField
                label="用户角色"
                variant="outlined"
                fullWidth
                size="small"
                select
                SelectProps={{
                  multiple: true,
                }}
              >
                {(groups || []).map((group) => (
                  <MenuItem key={group.id} value={group.id}>
                    {group.name}
                  </MenuItem>
                ))}
              </TextField>
            </Field>
          </Grid>
          <Grid item xs={6} sm={6} md={4}>
            <Field name="status" initialValue={[]}>
              <TextField
                label="用户状态"
                variant="outlined"
                fullWidth
                size="small"
                select
                SelectProps={{
                  multiple: true,
                }}
              >
                {Object.keys(ENUM_MAP_USER_STATE).map((status) => (
                  <MenuItem key={status} value={status}>
                    {ENUM_MAP_USER_STATE[status as any as UserStatus]}
                  </MenuItem>
                ))}
              </TextField>
            </Field>
          </Grid>
          <Grid item xs={6} sm={6} md={4} sx={{ display: 'flex', alignItems: 'center' }}>
            <Button variant="contained" onClick={() => form.submit()}>
              搜索用户
            </Button>
          </Grid>
        </Grid>
      </Form>
      {filterValues && (
        <AppPageList
          listReloadKey={filterValues}
          defaultPageNo={(getPageStateWhenPop('userList.pageNo') || 0) + 1}
          useBodyScroll
          loadPage={async (pageNo) => {
            const pageSize = 20;
            const users = await userApi.listUser({
              ...filterValues,
              user_id: filterValues.user_id ? parseInt(filterValues.user_id) : undefined,
              page_limit: pageSize,
              page_offset: (pageNo - 1) * pageSize,
            });
            const newUserList = pageNo === 1 ? users : [...userList, ...users];
            setUserList(newUserList);
            if (users.length) {
              setPageState('userList.pageNo', pageNo);
            }
            return {
              hasMore: users.length >= pageSize,
              list: users,
            };
          }}
        >
          <List sx={{ background: theme.palette.background.paper, paddingTop: 0, paddingBottom: 0 }}>
            {userList.map((user, index) => (
              <React.Fragment key={index}>
                <UserItem
                  user={user}
                  onUserEdit={(newUser) => {
                    const newList = [...userList];
                    newList[index] = newUser;
                    setUserList(newList);
                  }}
                />
                {index < userList.length - 1 && <Divider orientation="horizontal" />}
              </React.Fragment>
            ))}
          </List>
        </AppPageList>
      )}
    </AppPage>
  );
};

export default ManageUser;
