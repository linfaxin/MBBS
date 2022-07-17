import React from 'react';
import { Link as UmiLink } from 'umi';
import { Link } from '@mui/material';
import { LinkProps } from '@mui/material/Link/Link';

const AppLink: React.FC<
  LinkProps & {
    href?: undefined | string;
  }
> = (props) => {
  const { href } = props;
  if (!href || /^https?:/.test(href)) {
    return (
      <Link color="inherit" underline="none" {...props}>
        {props.children}
      </Link>
    );
  }
  return (
    <Link component={UmiLink} to={href} color="inherit" underline="none" {...props}>
      {props.children}
    </Link>
  );
};

export default AppLink;
