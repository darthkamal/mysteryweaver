import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  cssVariables: true,
  palette: {
    primary: {
      main: '#C2623A',    // terracotta — Umuofia earth tone
    },
    secondary: {
      main: '#8B5E3C',
    },
  },
  typography: {
    fontFamily: ['"Noto Serif"', 'Georgia', 'serif'].join(','),
  },
})
