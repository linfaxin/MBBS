import { useMediaQuery, useTheme } from '@mui/material';

export function useScreenWidthUpMD(): boolean {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.up('md'), {
    defaultMatches: document.documentElement.offsetWidth > theme.breakpoints.values['md'],
  });
}

export function useScreenWidthUpSM(): boolean {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.up('sm'), {
    defaultMatches: document.documentElement.offsetWidth > theme.breakpoints.values['md'],
  });
}

export function useScreenWidthUpLG(): boolean {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.up('lg'), {
    defaultMatches: document.documentElement.offsetWidth > theme.breakpoints.values['lg'],
  });
}
