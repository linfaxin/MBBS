import React, { ReactNode, useEffect, useState } from 'react';
import { IconButton, Menu, MenuItem, MenuProps, Typography } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';

export interface PopoverMenuItem {
  label: ReactNode;
  summary?: ReactNode;
  onClick?: () => void;
  divider?: boolean;
  disabled?: boolean;
  checked?: boolean;
}

export declare type OpenPopOptionItem = PopoverMenuItem | { groupTitle: ReactNode };

export type OpenPopoverMenuProps = {
  children?: React.ReactElement;
  options: Array<OpenPopOptionItem> | ((event: React.MouseEvent<HTMLElement>) => Array<OpenPopOptionItem>);
  triggerBy?: 'click' | 'context-menu';
  onClose?: () => void;
} & Partial<MenuProps>;

const OpenPopoverMenu: React.FC<OpenPopoverMenuProps> = (props) => {
  const { options: getOptions, triggerBy = 'click', children, ...menuProps } = props;
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [clickXY, setClickXY] = useState<null | [number, number]>(null);
  const open = Boolean(anchorEl || clickXY);

  const [options, setOptions] = useState<Array<OpenPopOptionItem>>(Array.isArray(getOptions) ? getOptions : []);

  useEffect(() => {
    if (Array.isArray(getOptions)) {
      setOptions(getOptions);
    }
  }, [getOptions]);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    if (typeof getOptions === 'function') {
      setOptions(getOptions(event));
    }
    if (triggerBy === 'click') {
      setAnchorEl(event.currentTarget);
    } else {
      setClickXY([event.clientX, event.clientY]);
    }
  };
  const handleClose = () => {
    setAnchorEl(null);
    setClickXY(null);
    props.onClose?.();
  };

  if (Array.isArray(getOptions) && !options.length) {
    return null;
  }

  return (
    <>
      {children ? (
        React.cloneElement(
          children,
          triggerBy === 'click'
            ? {
                onClick: (e: any) => {
                  children.props.onClick?.(e);
                  handleClick(e);
                },
              }
            : {
                onContextMenu: (e: any) => {
                  children.props.onContextMenu?.(e);
                  handleClick(e);
                },
              },
        )
      ) : (
        <IconButton
          onClick={triggerBy === 'click' ? handleClick : undefined}
          onContextMenu={triggerBy === 'context-menu' ? handleClick : undefined}
        >
          <MoreVertIcon />
        </IconButton>
      )}
      <Menu
        {...menuProps}
        anchorEl={anchorEl}
        anchorReference={anchorEl ? 'anchorEl' : 'anchorPosition'}
        anchorPosition={clickXY ? { left: clickXY[0], top: clickXY[1] } : undefined}
        open={open}
        disableRestoreFocus
        onClose={handleClose}
        onContextMenu={(e) => e.stopPropagation()}
        MenuListProps={{ dense: false }}
        sx={{
          ...menuProps?.sx,
        }}
      >
        {options.map((option, index) =>
          'groupTitle' in option ? (
            <Typography key={index} fontSize="12px" sx={{ opacity: 0.6, pl: 1, pt: 0.6, pb: 0.4 }}>
              {option.groupTitle}
            </Typography>
          ) : (
            <MenuItem
              key={index}
              divider={option.divider}
              disabled={option.disabled}
              onClick={() => {
                option.onClick?.();
                handleClose();
              }}
              sx={{ minWidth: 100 }}
            >
              {option.summary ? (
                <div>
                  <div>
                    {option.checked ? '✓ ' : ''}
                    {option.label}
                  </div>
                  <div style={{ opacity: 0.6, fontSize: 12, whiteSpace: 'pre-wrap' }}>{option.summary}</div>
                </div>
              ) : (
                <>
                  {option.checked ? '✓ ' : ''}
                  {option.label}
                </>
              )}
            </MenuItem>
          ),
        )}
      </Menu>
    </>
  );
};

export default OpenPopoverMenu;
