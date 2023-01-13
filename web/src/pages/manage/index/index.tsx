import { history, useModel } from 'umi';
import React, { useState } from 'react';
import { threadApi, userApi } from '@/api';
import { Alert, Button, List, ListItem, ListItemText, ListSubheader, Typography, useTheme } from '@mui/material';
import { UserStatus } from '@/api/base/user';
import AppLink from '@/components/app-link';
import AppPage from '@/components/app-page';
import { AllEnumThreadIsApproved, ThreadIsApproved } from '@/api/thread';
import TipIconButton from '@/components/tip-icon-button';

export default function ManagePage() {
  const theme = useTheme();
  const { user, setUser } = useModel('useLoginUser');
  const bbsSetting = useModel('useBBSSetting');
  const [checkingUserCount, setCheckingUserCount] = useState<number>();
  const [checkingThreadCount, setCheckingThreadCount] = useState<number>();
  const [totalUserCount, setTotalUserCount] = useState<number>();
  const [totalThreadCount, setTotalThreadCount] = useState<number>();

  return (
    <AppPage
      title="管理后台"
      initPage={async () => {
        const { token } = history.location.query || {}; // 从平台首页登录 会跳转入携带 token
        if (token) {
          const adminUser = await userApi.getLoginUserByToken(String(token));
          setUser({ ...adminUser, token: token as string });
          history.replace('?'); // 清空链接里的 token
        }
        userApi.countUser({ status: UserStatus.Checking }).then(setCheckingUserCount);
        threadApi.countThread({ is_approved: ThreadIsApproved.checking }).then(setCheckingThreadCount);
        userApi.countUser().then(setTotalUserCount);
        threadApi.countThread({ is_approved: AllEnumThreadIsApproved.join(',') }).then(setTotalThreadCount);
      }}
      showInitPageLoading={false}
    >
      <Typography variant="h5" gutterBottom sx={{ paddingTop: 2, paddingLeft: 2 }}>
        欢迎回来，{user?.nickname || user?.username}
      </Typography>
      <List sx={{ background: theme.palette.background.paper, marginTop: 2 }}>
        <ListItem>
          <ListItemText primary="论坛名称" secondary={`${bbsSetting.site_name || '(未设置)'}`} />
          <AppLink href="/manage/base">
            <Button variant="outlined">去修改</Button>
          </AppLink>
        </ListItem>
      </List>
      <List sx={{ background: theme.palette.background.paper, marginTop: 2 }} subheader={<ListSubheader>审核信息</ListSubheader>}>
        <ListItem>
          <ListItemText primary="审核中用户" secondary={`${typeof checkingUserCount === 'number' ? checkingUserCount : ' '}个`} />
          <AppLink href={`/manage/user?status=${UserStatus.Checking}`}>
            <Button variant="outlined">去审核</Button>
          </AppLink>
        </ListItem>
        <ListItem>
          <ListItemText primary="审核中帖子" secondary={`${typeof checkingThreadCount === 'number' ? checkingThreadCount : ' '}个`} />
          <AppLink href={`/manage/thread?is_approved=${ThreadIsApproved.checking}`}>
            <Button variant="outlined">去审核</Button>
          </AppLink>
        </ListItem>
      </List>
      <List sx={{ background: theme.palette.background.paper, marginTop: 2 }} subheader={<ListSubheader>数据概况</ListSubheader>}>
        <ListItem>
          <ListItemText
            primary={
              <>
                总用户量
                <TipIconButton message="包含了全部状态（正常、禁用、审核中、审核失败）的用户量" />
              </>
            }
            secondary={totalUserCount}
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary={
              <>
                总帖子量
                <TipIconButton message="包含了全部状态（正常、审核中、审核失败）的帖子" />
              </>
            }
            secondary={totalThreadCount}
          />
        </ListItem>
      </List>
    </AppPage>
  );
}
