import React from 'react';
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';

const MouseOverTip: React.FC<{
  tip: string;
  children: React.ReactElement;
}> = (props) => {
  const { tip, children } = props;
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);

  const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      {React.cloneElement(children, {
        onMouseEnter: handlePopoverOpen,
        onMouseLeave: handlePopoverClose,
      })}
      <Popover
        sx={{
          pointerEvents: 'none',
        }}
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        onClose={handlePopoverClose}
        disableRestoreFocus
      >
        <Typography sx={{ p: 1, background: '#333', color: 'white', maxWidth: '60vw', whiteSpace: 'pre-wrap' }}>{tip}</Typography>
      </Popover>
    </>
  );
};

export default MouseOverTip;
