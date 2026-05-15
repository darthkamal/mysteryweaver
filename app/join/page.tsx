import JoinFlow from './JoinFlow'
import Link from 'next/link'
import { Box, Typography } from '@mui/material'

export default function JoinPage() {
  return (
    <>
      <JoinFlow />
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Are you the Game Master?{' '}
          <Link href="/auth" style={{ color: 'inherit' }}>
            GM login →
          </Link>
        </Typography>
      </Box>
    </>
  )
}
