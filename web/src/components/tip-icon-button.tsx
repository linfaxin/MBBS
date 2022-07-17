import React from 'react';
import { IconButton } from '@mui/material';
import HelpIcon from '@mui/icons-material/Help';
import OpenAlertDialog from '@/components/open-alert-dialog';
import { useScreenWidthUpMD } from '@/utils/use-screen-width';
import MouseOverTip from '@/components/mouse-over-tip';

const TipIconButton = (props: { message: string }) => {
  const isWidthUpDM = useScreenWidthUpMD();
  const { message } = props;
  const icon = (
    <IconButton color="primary" size="small">
      <HelpIcon
        sx={{
          width: 18,
          color: '#999',
          transform: 'translate(0, -1px)',
        }}
      />
    </IconButton>
  );
  if (isWidthUpDM) {
    return <MouseOverTip tip={message}>{icon}</MouseOverTip>;
  }
  return <OpenAlertDialog message={message}>{icon}</OpenAlertDialog>;
};

export default TipIconButton;
