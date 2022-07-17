import React, { useState } from 'react';
import { Collapse, ListItem, ListItemIcon, ListItemProps, ListItemText } from '@mui/material';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';

const GroupListItem: React.FC<
  ListItemProps & {
    text: React.ReactNode;
    icon?: React.ReactNode;
    defaultOpen?: boolean;
    onOpenChanged?: (open: boolean) => void;
  }
> = (props) => {
  const { text, icon, onOpenChanged, defaultOpen = false, children, ...otherProps } = props;
  const [open, setOpen] = useState(defaultOpen);
  return (
    <>
      <ListItem
        {...(otherProps as any)}
        button
        onClick={() => {
          setOpen(!open);
          onOpenChanged?.(!open);
        }}
      >
        {icon && <ListItemIcon>{icon}</ListItemIcon>}
        {typeof text === 'string' ? <ListItemText primary={text} /> : text}
        {open ? <ExpandLess /> : <ExpandMore />}
      </ListItem>
      <Collapse in={open} timeout="auto" unmountOnExit sx={{ paddingLeft: 3 }}>
        {children}
      </Collapse>
    </>
  );
};

export default GroupListItem;
