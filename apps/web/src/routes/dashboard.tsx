import { createFileRoute, redirect } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: () => { throw redirect({ to: "/home" }); },
  component: DashboardPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      tab: (search.tab as string) || undefined,
    };
  },
});

function DashboardPage() {
  return <ComingSoon />;
}
