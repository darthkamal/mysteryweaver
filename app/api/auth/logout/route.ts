import { NextResponse } from 'next/server'

export async function POST() {
  const res = NextResponse.json({ loggedOut: true })
  res.cookies.set('mw-gm-token', '', { maxAge: 0, path: '/' })
  return res
}
