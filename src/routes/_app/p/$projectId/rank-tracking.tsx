import { createFileRoute, Outlet, useParams } from "@tanstack/react-router";
import { BackLink, PageHeader } from "@/client/components/PageHeader";

export const Route = createFileRoute("/_app/p/$projectId/rank-tracking")({
  component: RankTrackingLayout,
});

function RankTrackingLayout() {
  // Only the domain detail route has a config id, and only it links back.
  const { projectId, configId } = useParams({ strict: false });

  return (
    <div className="px-4 py-4 pb-24 overflow-auto md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <PageHeader
          title="順位計測"
          description="ドメインごとのキーワード順位を計測します"
          backLink={
            projectId && configId ? (
              <BackLink to="/p/$projectId/rank-tracking" params={{ projectId }}>
                計測中のドメイン
              </BackLink>
            ) : undefined
          }
        />

        <Outlet />
      </div>
    </div>
  );
}
