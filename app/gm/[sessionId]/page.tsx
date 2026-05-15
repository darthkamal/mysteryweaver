import SessionRunner from './SessionRunner'

export default async function SessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params
  return <SessionRunner sessionId={sessionId} />
}
