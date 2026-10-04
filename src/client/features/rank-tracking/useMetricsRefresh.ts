import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { refreshTrackingKeywordMetrics } from "@/serverFunctions/rank-tracking";

export function useMetricsRefresh(projectId: string, configId: string) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () =>
      refreshTrackingKeywordMetrics({
        data: { projectId, configId },
      }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({
        queryKey: ["rankTrackingResults", projectId, configId],
      });
      toast.success(`${result.updated}件のキーワード指標を更新しました`);
    },
  });
  return { refresh: mutation.mutate, isRefreshing: mutation.isPending };
}
