'use client'
import { Card, CardContent, Typography, Box } from '@mui/material'
import type { ReactNode } from 'react'

interface Props {
  title?: string
  action?: ReactNode
  children: ReactNode
  /** tighter padding for dense panels */
  dense?: boolean
}

export default function SectionCard({ title, action, children, dense }: Props) {
  return (
    <Card>
      <CardContent sx={{ p: dense ? 2 : 2.5, '&:last-child': { pb: dense ? 2 : 2.5 } }}>
        {(title || action) && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            {title && (
              <Typography variant="overline" color="text.secondary">
                {title}
              </Typography>
            )}
            {action}
          </Box>
        )}
        {children}
      </CardContent>
    </Card>
  )
}
