import React from 'react';
import { history } from 'umi';
import { Box, Button, Divider, List, Typography, useTheme } from '@mui/material';
import AppPage from '@/components/app-page';
import { userApi } from '@/api';
import AppPageList from '@/components/app-page-list';
import { getPageStateWhenPop, setPageState, usePageState } from '@/utils/use-page-history-hooks';
import { User } from '@/api/base/user';
import { getResourceUrl } from '@/utils/resource-url';
import AppLink from '@/components/app-link';
import VisibilityIcon from '@mui/icons-material/Visibility';

export default function UserSearchPage() {
  const theme = useTheme();
  const { keywords } = history.location.query || {};

  const [userList, setUserList] = usePageState<User[]>('userList', []);

  return (
    <AppPage title="搜索用户">
      <AppPageList
        defaultPageNo={(getPageStateWhenPop('userList.pageNo') || 0) + 1}
        useBodyScroll
        loadPage={async (pageNo) => {
          const pageSize = 20;
          const users = await userApi.listUser({
            nickname_like: String(keywords),
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
        renderPageEmpty={
          <Typography textAlign="center" p={2} component="div">
            <span>未搜索到用户</span>
            <div style={{ height: 20 }} />
          </Typography>
        }
      >
        <List sx={{ background: theme.palette.background.paper, paddingTop: 0, paddingBottom: 0 }}>
          {userList.map((user, index) => (
            <React.Fragment key={index}>
              <Box sx={{ padding: 2, display: 'flex' }}>
                <img
                  alt="avatar"
                  src={getResourceUrl(user.avatar) || require('@/images/default-avatar.png')}
                  style={{ width: 60, height: 60 }}
                />
                <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, ml: 2 }}>
                  <Typography>{user.nickname}</Typography>
                  <Typography sx={{ fontSize: 13, opacity: 0.6 }}>
                    {user.username}(ID: {user.id})
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', ml: 2 }}>
                  <AppLink href={`/user/detail?id=${user.id}`}>
                    <Button startIcon={<VisibilityIcon />} fullWidth size="small">
                      详情
                    </Button>
                  </AppLink>
                </Box>
              </Box>
              {index < userList.length - 1 && <Divider orientation="horizontal" />}
            </React.Fragment>
          ))}
        </List>
      </AppPageList>
    </AppPage>
  );
}
