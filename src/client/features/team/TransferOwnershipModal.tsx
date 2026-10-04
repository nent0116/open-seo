import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { getErrorCode } from "@/client/lib/error-messages";
import { captureClientEvent } from "@/client/lib/posthog";
import { transferOwnership } from "@/serverFunctions/organization";

// NOT_FOUND: the member left. FORBIDDEN: the caller is no longer the owner
// (another tab). CONFLICT: a row changed mid-transfer.
function isTeamChangedError(error: Error) {
  const code = getErrorCode(error);
  return code === "CONFLICT" || code === "NOT_FOUND" || code === "FORBIDDEN";
}

export function TransferOwnershipModal({
  member,
  onClose,
  onTransferred,
}: {
  member: { id: string; user: { name?: string | null; email: string } };
  onClose: () => void;
  onTransferred: () => void;
}) {
  const displayName = member.user.name || member.user.email;

  const transferMutation = useMutation({
    mutationFn: () => transferOwnership({ data: { memberId: member.id } }),
    onSuccess: () => {
      captureClientEvent("team:ownership_transfer");
      toast.success(`${displayName}が所有者になりました`);
      onTransferred();
      onClose();
    },
    onError: (error: Error) => {
      const teamChanged = isTeamChangedError(error);
      toast.error(
        teamChanged
          ? "この画面を開いている間にチーム構成が変更されました。所有権は変更されていません。"
          : "所有権を移譲できませんでした。所有権は変更されていません。",
      );
      // Refresh either way so the list and the caller's role are current.
      onTransferred();
      // The confirmation is stale once the team changed: close it so the
      // refreshed list shows who is still there. Other errors keep it open
      // for a retry.
      if (teamChanged) onClose();
    },
  });

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !transferMutation.isPending) onClose();
      }}
    >
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>所有権を移譲しますか？</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground" data-ph-mask>
              {displayName}
            </span>{" "}
            がこの組織の所有者となり、請求を管理します。あなたは管理者となり、各プロジェクトへのすべてのアクセス権を保持します。
          </DialogDescription>
          <DialogDescription>
            プロジェクト、データ、サブスクリプションは組織に残ります。今後、所有権を移譲できるのは新しい所有者だけです。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={transferMutation.isPending}
          >
            キャンセル
          </Button>
          <Button
            onClick={() => transferMutation.mutate()}
            pending={transferMutation.isPending}
          >
            所有権を移譲
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
