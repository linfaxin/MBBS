import React from 'react';
import { Box, Typography } from '@mui/material';
import { useModel } from 'umi';
import { getResourceUrl } from '@/utils/resource-url';
import MarkdownPreview from '@/components/vditor/markdown-preview';
import showAlert from '@/utils/show-alert';

const BBSInfo = () => {
  const bbsSetting = useModel('useBBSSetting');
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        p: 2,
      }}
    >
      <img
        alt="logo"
        src={getResourceUrl(bbsSetting.logo) || require('@/images/default-logo.png')}
        style={{ width: 80, height: 80, cursor: 'pointer' }}
        onClick={() => {
          showAlert({
            title: '查看大图',
            message: <img style={{ width: '100%' }} src={getResourceUrl(bbsSetting.logo) || require('@/images/default-logo.png')} alt="" />,
          });
        }}
      />
      <Typography variant="h6" pt={2} pb={2} textAlign="center">
        {bbsSetting.site_name || '(未设置论坛名称)'}
      </Typography>
      <MarkdownPreview style={{ fontSize: '14px' }} markdown={bbsSetting.site_introduction || '(未设置论坛介绍)'} />
    </Box>
  );
};

export default BBSInfo;
