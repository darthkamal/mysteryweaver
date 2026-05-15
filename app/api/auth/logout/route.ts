import { NextResponse } from 'next/server'

export async function POST() {
  const res = NextResponse.json({ loggedOut: true })
  res.cookies.set('mw-gm-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  return res
}
