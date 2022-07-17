import React, { ReactNode } from 'react';
import { IconButton, Menu, MenuItem } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';

const OpenPopoverMenu: React.FC<{
  children?: React.ReactElement;
  options: Array<{ label: ReactNode; onClick: () => void }>;
}> = (props) => {
  const { options, children } = props;
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  if (!options || !options.length) {
    return null;
  }
  const handleClose = () => {
    setAnchorEl(null);
  };
  return (
    <>
      {children ? (
        React.cloneElement(children, { onClick: handleClick })
      ) : (
        <IconButton onClick={handleClick}>
          <MoreVertIcon />
        </IconButton>
      )}
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        {options.map((option, index) => (
          <MenuItem
            key={index}
            onClick={() => {
              option.onClick();
              handleClose();
            }}
            sx={{ minWidth: 100 }}
          >
            {option.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default OpenPopoverMenu;
