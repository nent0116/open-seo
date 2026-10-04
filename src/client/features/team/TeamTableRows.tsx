import { Crown, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { RowActionsMenu } from "@/client/components/RowActionsMenu";
import { Badge } from "@/client/components/ui/badge";
import { DropdownMenuItem } from "@/client/components/ui/dropdown-menu";
import { TableCell, TableRow } from "@/client/components/ui/table";
import { hasOrgPermission } from "@/lib/org-permissions";

const ROLE_LABELS: Record<string, string> = {
  owner: "所有者",
  admin: "管理者",
  member: "メンバー",
};

function formatRole(role: string) {
  return role
    .split(",")
    .map((name) => ROLE_LABELS[name.trim()] ?? name.trim())
    .join(", ");
}

export type Member = {
  id: string;
  userId: string;
  role: string;
  user: { name?: string | null; email: string };
};

type Invitation = {
  id: string;
  email: string;
  role?: string | null;
  expiresAt: Date | string;
};

export function MemberRow({
  member,
  isSelf,
  canManageTeam,
  isOwner,
  isRemoving,
  onRemove,
  onTransferOwnership,
}: {
  member: Member;
  isSelf: boolean;
  canManageTeam: boolean;
  isOwner: boolean;
  isRemoving: boolean;
  onRemove: () => void;
  onTransferOwnership: () => void;
}) {
  const memberIsOwner = hasOrgPermission(member.role, {
    billing: ["manage"],
  });
  // Owners are protected server-side (only an owner can touch an owner; the
  // last owner can't be removed) — don't render controls that would just 403.
  const canRemove = canManageTeam && !isSelf && (!memberIsOwner || isOwner);
  // Owners can always remove, so this only ever adds to the remove menu.
  const canTransferOwnership = isOwner && !isSelf && !memberIsOwner;
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false);

  return (
    <TableRow>
      <TableCell className="max-w-[280px]">
        <p className="truncate font-medium" data-ph-mask>
          {member.user.name || member.user.email}
          {isSelf ? (
            <span className="font-normal text-muted-foreground"> （自分）</span>
          ) : null}
        </p>
        <p className="truncate text-xs text-muted-foreground" data-ph-mask>
          {member.user.email}
        </p>
      </TableCell>
      <TableCell>
        <Badge variant="secondary">{formatRole(member.role)}</Badge>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">有効</TableCell>
      <TableCell>
        {canRemove ? (
          <RowActionsMenu label={`${member.user.email}のメンバー操作`}>
            {canTransferOwnership ? (
              <DropdownMenuItem onClick={onTransferOwnership}>
                <Crown />
                所有権を移譲
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              variant="destructive"
              disabled={isRemoving}
              onClick={() => setIsConfirmingRemove(true)}
            >
              <Trash2 />
              メンバーを削除
            </DropdownMenuItem>
          </RowActionsMenu>
        ) : null}
        {isConfirmingRemove ? (
          <ConfirmDialog
            title={`${member.user.email}をこの組織から削除しますか？`}
            confirmLabel="メンバーを削除"
            destructive
            onClose={() => setIsConfirmingRemove(false)}
            onConfirm={() => {
              setIsConfirmingRemove(false);
              onRemove();
            }}
          >
            このメンバーは直ちにアクセスできなくなります。
          </ConfirmDialog>
        ) : null}
      </TableCell>
    </TableRow>
  );
}

export function InvitationRow({
  invitation,
  canManageTeam,
  isResending,
  isCanceling,
  onResend,
  onCancel,
}: {
  invitation: Invitation;
  canManageTeam: boolean;
  isResending: boolean;
  isCanceling: boolean;
  onResend: () => void;
  onCancel: () => void;
}) {
  return (
    <TableRow>
      <TableCell className="max-w-[280px]">
        <p className="truncate font-medium" data-ph-mask>
          {invitation.email}
        </p>
      </TableCell>
      <TableCell>
        <Badge variant="secondary">
          {formatRole(invitation.role ?? "member")}
        </Badge>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        招待済み・有効期限{" "}
        {new Date(invitation.expiresAt).toLocaleDateString("ja-JP")}
      </TableCell>
      <TableCell>
        {canManageTeam ? (
          <RowActionsMenu label={`${invitation.email}への招待操作`}>
            <DropdownMenuItem disabled={isResending} onClick={onResend}>
              <Send />
              招待を再送
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              disabled={isCanceling}
              onClick={onCancel}
            >
              <Trash2 />
              招待を取り消す
            </DropdownMenuItem>
          </RowActionsMenu>
        ) : null}
      </TableCell>
    </TableRow>
  );
}
