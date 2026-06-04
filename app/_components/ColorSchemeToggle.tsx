'use client'
import { useColorScheme } from '@mui/material/styles'
import { IconButton, Tooltip } from '@mui/material'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'

export default function ColorSchemeToggle({ size = 'medium' }: { size?: 'small' | 'medium' }) {
  const { mode, systemMode, setMode } = useColorScheme()
  // Avoid hydration mismatch: render a hidden placeholder until mounted (mode is undefined on server)
  if (!mode) return <IconButton size={size} disabled aria-hidden sx={{ visibility: 'hidden' }}><LightModeIcon /></IconButton>

  const resolved = mode === 'system' ? systemMode : mode
  const next = resolved === 'dark' ? 'light' : 'dark'
  return (
    <Tooltip title={`Switch to ${next} mode`}>
      <IconButton size={size} onClick={() => setMode(next)} color="inherit" aria-label="Toggle color scheme">
        {resolved === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
      </IconButton>
    </Tooltip>
  )
}
