import React, { useState } from 'react';
import { Paper } from '@mui/material';
import { PaperProps } from '@mui/material/Paper/Paper';

const PaperClickable: React.FC<
  {
    defaultElevation?: number;
    hoverElevation?: number;
    activeElevation?: number;
  } & PaperProps
> = (props) => {
  const { defaultElevation = 0, hoverElevation = 3, activeElevation = hoverElevation + 1, ...paperProps } = props;
  const [isHover, setIsHover] = useState(false);
  const [isActive, setIsActive] = useState(false);
  return (
    <Paper
      {...paperProps}
      elevation={isActive ? activeElevation : isHover ? hoverElevation : defaultElevation}
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => {
        setIsHover(false);
        setIsActive(false);
      }}
      onMouseDown={() => setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
      onTouchStart={() => setIsActive(true)}
      onTouchEnd={() => setIsActive(false)}
      onTouchCancel={() => setIsActive(false)}
    >
      {props.children}
    </Paper>
  );
};

export default PaperClickable;
