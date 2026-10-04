import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QueryState } from "@/client/components/QueryState";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { revalidateLogic } from "@tanstack/react-form";
import { toast } from "sonner";
import { z } from "zod";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { SectionHeader } from "@/client/components/PageHeader";
import { useAppForm } from "@/client/components/form/useAppForm";
import { Button } from "@/client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { RowActionsMenu } from "@/client/components/RowActionsMenu";
import { DropdownMenuItem } from "@/client/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCard,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import { CopyButton } from "@/client/components/CopyButton";
import { captureClientEvent } from "@/client/lib/posthog";
import { authClient } from "@/lib/auth-client";

// Better Auth rejects longer names with INVALID_NAME_LENGTH.
const MAX_KEY_NAME_LENGTH = 32;

const createKeySchema = z.object({
  name: z.string().trim().min(1, "名前を入力してください"),
});

export function ApiKeySettings() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<{ id: string; name: string } | null>(
    null,
  );

  const mcpUrl =
    typeof window === "undefined"
      ? "https://app.openseo.so/mcp"
      : `${window.location.origin}/mcp`;

  const apiKeysQuery = useQuery({
    queryKey: ["apiKeys"],
    queryFn: async () => {
      const result = await authClient.apiKey.list();
      if (result.error) {
        throw new Error(
          result.error.message ?? "APIキーを読み込めませんでした",
        );
      }
      return result.data.apiKeys.map((key) => ({
        id: key.id,
        name: key.name,
        start: key.start,
        createdAt: new Date(key.createdAt),
        lastRequest: key.lastRequest ? new Date(key.lastRequest) : null,
      }));
    },
  });

  const createMutation = useMutation({
    mutationFn: async (keyName: string) => {
      const result = await authClient.apiKey.create({ name: keyName });
      if (result.error || !result.data?.key) {
        throw new Error(
          result.error?.message ?? "APIキーを作成できませんでした",
        );
      }
      return result.data.key;
    },
    onSuccess: (key) => {
      setCreatedKey(key);
      captureClientEvent("mcp:api_key_created");
      void queryClient.invalidateQueries({ queryKey: ["apiKeys"] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (keyId: string) => {
      const result = await authClient.apiKey.delete({ keyId });
      if (result.error) {
        throw new Error(
          result.error.message ?? "APIキーを無効化できませんでした",
        );
      }
    },
    onSuccess: () => {
      captureClientEvent("mcp:api_key_revoked");
      toast.success("APIキーを無効化しました");
      setRevoking(null);
      void queryClient.invalidateQueries({ queryKey: ["apiKeys"] });
    },
  });

  const form = useAppForm({
    defaultValues: { name: "" },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: createKeySchema },
    onSubmit: async ({ value }) => {
      await createMutation.mutateAsync(value.name.trim());
    },
  });

  const closeCreateModal = () => {
    setIsCreateOpen(false);
    setCreatedKey(null);
    form.reset();
  };

  return (
    <section className="space-y-3">
      <SectionHeader title="APIキー" />
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-sm">OAuthを利用できないMCPクライアントを認証</p>
          <p className="mt-1 text-sm text-muted-foreground">
            通常のログイン手順を利用できないHermesなどのリモートエージェントで使用します。
          </p>
          <p className="mt-1 text-sm">
            <a
              className="text-primary underline-offset-4 hover:underline"
              href="https://openseo.so/docs/mcp"
              target="_blank"
              rel="noreferrer"
            >
              セットアップガイド
            </a>
          </p>
        </div>
        <Button size="sm" onClick={() => setIsCreateOpen(true)}>
          APIキーを作成
        </Button>
      </div>

      <QueryState
        query={apiKeysQuery}
        errorFallback="APIキーを読み込めませんでした。"
      >
        {(apiKeys) =>
          apiKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              APIキーはまだありません。
            </p>
          ) : (
            <TableCard>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名前</TableHead>
                    <TableHead>キー</TableHead>
                    <TableHead>作成日時</TableHead>
                    <TableHead>最終使用日時</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell className="max-w-[220px] truncate font-medium">
                        {key.name || "名前のないキー"}
                      </TableCell>
                      <TableCell
                        className="font-mono text-xs text-muted-foreground"
                        data-ph-mask
                      >
                        {key.start || "oseo_"}…
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {key.createdAt.toLocaleDateString("ja-JP")}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {key.lastRequest
                          ? key.lastRequest.toLocaleDateString("ja-JP")
                          : "未使用"}
                      </TableCell>
                      <TableCell>
                        <RowActionsMenu
                          label={`${key.name || "APIキー"}の操作`}
                        >
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() =>
                              setRevoking({
                                id: key.id,
                                name: key.name || "名前のないキー",
                              })
                            }
                          >
                            <Trash2 />
                            キーを無効化
                          </DropdownMenuItem>
                        </RowActionsMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableCard>
          )
        }
      </QueryState>

      {revoking ? (
        <ConfirmDialog
          title={`「${revoking.name}」を無効化しますか？`}
          confirmLabel="キーを無効化"
          destructive
          pending={revokeMutation.isPending}
          onClose={() => setRevoking(null)}
          onConfirm={() => revokeMutation.mutate(revoking.id)}
        >
          このキーを使用しているクライアントは動作しなくなります。
        </ConfirmDialog>
      ) : null}

      <Dialog
        open={isCreateOpen}
        // The key is shown once, so only Done closes the reveal step. Escape
        // and an outside click close the name step.
        onOpenChange={(open) => {
          if (!open && createdKey == null) closeCreateModal();
        }}
      >
        <DialogContent
          showCloseButton={false}
          // A minmax(0, 1fr) track, so the long key scrolls in its box and does
          // not push the Copy and Done buttons out of the dialog.
          className="grid-cols-1 sm:max-w-md"
        >
          {createdKey ? (
            <>
              <DialogHeader>
                <DialogTitle>新しいAPIキーをコピー</DialogTitle>
                <DialogDescription>
                  このキーは再表示されません。MCPサーバーURL（
                  <span className="font-mono text-xs break-all">{mcpUrl}</span>
                  ）へのリクエストで、
                  <span className="font-mono text-xs">
                    Authorization: Bearer
                  </span>
                  形式の認証情報として送信してください。
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center gap-2">
                <code
                  className="min-w-0 flex-1 overflow-x-auto rounded bg-muted px-2.5 py-2 font-mono text-xs"
                  data-ph-mask
                >
                  {createdKey}
                </code>
                <CopyButton
                  value={createdKey}
                  successMessage="APIキーをコピーしました"
                  label="APIキーをコピー"
                  variant="ghost"
                  size="icon-sm"
                />
              </div>
              <DialogFooter>
                <Button onClick={closeCreateModal}>完了</Button>
              </DialogFooter>
            </>
          ) : (
            <form.AppForm>
              <form.Form className="grid gap-4">
                <DialogHeader>
                  <DialogTitle>APIキーを作成</DialogTitle>
                </DialogHeader>
                <form.AppField name="name">
                  {(field) => (
                    <field.TextField
                      label="名前"
                      placeholder="例：ノートPCのClaude Code"
                      maxLength={MAX_KEY_NAME_LENGTH}
                      required
                      autoFocus
                    />
                  )}
                </form.AppField>
                <DialogFooter>
                  <Button variant="ghost" onClick={closeCreateModal}>
                    キャンセル
                  </Button>
                  <form.SubmitButton>作成</form.SubmitButton>
                </DialogFooter>
              </form.Form>
            </form.AppForm>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
