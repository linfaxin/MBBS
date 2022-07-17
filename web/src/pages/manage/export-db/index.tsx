import React from 'react';
import { Alert, List, ListItem, ListItemText, ListSubheader, useTheme } from '@mui/material';
import AppPage from '@/components/app-page';
import DoTaskButton from '@/components/do-task-button';
import { manageApi } from '@/api';
import { useRequest } from 'ahooks';
import { formatSize } from '@/utils/format-util';

const BaseSetting = () => {
  const theme = useTheme();
  const { data: dbSize } = useRequest(() => manageApi.getDBDataSize());

  return (
    <AppPage title="导出论坛数据" parentPage={[{ title: '管理后台', href: '/manage' }]}>
      <Alert severity="info" sx={{ marginBottom: 2 }}>
        数据库包含了论坛除附件图片外的所有数据，导出后可以使用 SQLite 相关工具查看
      </Alert>
      <List sx={{ background: theme.palette.background.paper, marginTop: 2 }} component="nav">
        <ListItem>
          <ListItemText primary="数据库(SQLite)" secondary={dbSize && formatSize(dbSize)} />
          <DoTaskButton
            color="primary"
            variant="outlined"
            failAlert
            task={async () => {
              const { key } = await manageApi.prepareExportDBData();
              window.open(`${window.MBBS_BASE_URL.replace(/\/$/, '')}/manage/downloadPreparedDBData?key=${key}`);
            }}
          >
            导出
          </DoTaskButton>
        </ListItem>
      </List>
    </AppPage>
  );
};

export default BaseSetting;
