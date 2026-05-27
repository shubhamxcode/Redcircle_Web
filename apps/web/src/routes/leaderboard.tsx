import { createFileRoute } from '@tanstack/react-router'
import Leaderboard from '@/components/Leaderboard'

export const Route = createFileRoute('/leaderboard')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="container mx-auto py-10 px-4">
      <Leaderboard />
    </div>
  )
}
