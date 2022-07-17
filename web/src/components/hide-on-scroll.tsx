import React, { ReactElement } from 'react';
import { Slide, useScrollTrigger } from '@mui/material';

const HideOnScroll: React.FC<{
  container?: Node | Window;
  direction?: 'left' | 'right' | 'up' | 'down';
  children: ReactElement;
}> = (props) => {
  const { children, container, direction } = props;

  const trigger = useScrollTrigger({
    target: container,
  });

  return (
    <Slide appear={false} direction={direction || 'down'} in={!trigger}>
      {children}
    </Slide>
  );
};

export default HideOnScroll;
