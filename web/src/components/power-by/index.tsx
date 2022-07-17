import React from 'react';
import { Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useModel } from 'umi';
import { DEFAULT_POWER_BY_MARKDOWN } from '@/consts';
import MarkdownPreview from '@/components/vditor/markdown-preview';

const MyBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  fontSize: 12,
  color: theme.palette.grey['600'],
  padding: 16,
  position: 'relative',
  '& .vditor-reset a': {
    color: theme.palette.primary.main,
    textDecoration: 'none',
  },
}));

const PowerBy = () => {
  const bbsSetting = useModel('useBBSSetting');
  return (
    <MyBox>
      <MarkdownPreview
        style={{ fontSize: 'inherit' }}
        markdown={bbsSetting.ui_power_by_text == null ? DEFAULT_POWER_BY_MARKDOWN : bbsSetting.ui_power_by_text}
      />
    </MyBox>
  );
};

export default PowerBy;
