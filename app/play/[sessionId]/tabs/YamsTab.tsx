'use client'
import { Box, Typography } from '@mui/material'
interface Props { sessionId: string; uid: string }
export default function YamsTab({ sessionId: _s, uid: _u }: Props) {
  return <Box sx={{ p: 3 }}><Typography>Yams tab — coming soon</Typography></Box>
}
