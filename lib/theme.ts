import { createTheme } from '@mui/material/styles'

// MD3 "Editorial Hybrid" — warm paper surfaces, white cards,
// serif display (Fraunces) + sans body (Inter). Light + dark.
export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'class' },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#B0552F', contrastText: '#FFFFFF' },
        secondary: { main: '#8B5E3C', contrastText: '#FFFFFF' },
        background: { default: '#FBF7F1', paper: '#FFFFFF' },
        text: { primary: '#2B2320', secondary: '#7A6E63' },
        divider: '#E6DBCD',
        success: { main: '#5E7355' },
      },
    },
    dark: {
      palette: {
        primary: { main: '#E08A5F', contrastText: '#2B1A10' },
        secondary: { main: '#C09A6B', contrastText: '#241A10' },
        background: { default: '#1A1512', paper: '#221C18' },
        text: { primary: '#EFE3D4', secondary: '#B3A595' },
        divider: '#3A3029',
        success: { main: '#8BA47F' },
      },
    },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: 'var(--font-inter), system-ui, sans-serif',
    h3: { fontFamily: 'var(--font-fraunces), Georgia, serif', fontWeight: 600 },
    h4: { fontFamily: 'var(--font-fraunces), Georgia, serif', fontWeight: 600 },
    h5: { fontFamily: 'var(--font-fraunces), Georgia, serif', fontWeight: 600 },
    h6: { fontFamily: 'var(--font-fraunces), Georgia, serif', fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
    overline: { letterSpacing: 1.2, fontWeight: 600 },
  },
})
