import PlayerBinder from './PlayerBinder'

export default async function PlayPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const { sessionId } = await params
  return <PlayerBinder sessionId={sessionId} />
}
