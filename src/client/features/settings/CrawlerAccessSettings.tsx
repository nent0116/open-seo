import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  CrawlerAccessForm,
  crawlerCredentialsQueryKey,
} from "@/client/features/crawler-access/CrawlerAccessForm";
import {
  deleteCrawlerCredential,
  listCrawlerCredentials,
} from "@/serverFunctions/crawlerAccess";
import { isCrawlerAccessExpired } from "@/shared/crawler-access";
import { Button } from "@/client/components/ui/button";
import {
  Table,
  TableBody,
  TableCard,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("ja-JP");

/**
 * Shopify crawler-access signatures saved on this project. The audit crawler
 * replays them per host, and other projects in the organization that audit
 * the same host pick them up too.
 */
export function CrawlerAccessSettings({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);

  const credentialsQuery = useQuery({
    queryKey: crawlerCredentialsQueryKey,
    queryFn: () => listCrawlerCredentials(),
    select: (rows) => rows.filter((row) => row.projectId === projectId),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCrawlerCredential({ data: { id } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: crawlerCredentialsQueryKey,
      });
      toast.success("クローラーアクセスを削除しました");
    },
  });

  const credentials = credentialsQuery.data ?? [];

  return (
    <Card size="lg">
      <CardHeader className={isAdding ? "border-b" : undefined}>
        <CardTitle>
          <h2 className="leading-tight">Shopify</h2>
        </CardTitle>
        <CardAction className="self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAdding((value) => !value)}
          >
            {isAdding ? "キャンセル" : "連携"}
          </Button>
        </CardAction>
      </CardHeader>
      {isAdding ? (
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Shopify管理画面の「オンラインストア」→「各種設定」→「クローラーアクセス」で作成した署名を貼り付けます。組織内でこのドメインを監査する際、各リクエストと一緒に送信されます。
          </p>
          <CrawlerAccessForm
            projectId={projectId}
            initialHost=""
            onSaved={() => setIsAdding(false)}
          />
        </CardContent>
      ) : null}
      {credentialsQuery.isError || credentials.length > 0 ? (
        <CardContent>
          {credentialsQuery.isError ? (
            <p className="text-sm text-destructive">
              クローラーアクセスを読み込めませんでした。
            </p>
          ) : credentials.length > 0 ? (
            <TableCard>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ドメイン</TableHead>
                    <TableHead>種類</TableHead>
                    <TableHead>追加日時</TableHead>
                    <TableHead>有効期限</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {credentials.map((credential) => (
                    <TableRow key={credential.id}>
                      <TableCell className="font-mono">
                        {credential.host}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        Shopify署名
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(credential.createdAt)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {credential.expiresAt
                          ? formatDate(credential.expiresAt)
                          : "Unknown"}
                        {isCrawlerAccessExpired(credential.expiresAt) && (
                          <span className="ml-2 text-destructive">
                            期限切れ
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`クローラーアクセスを削除：${credential.host}`}
                          disabled={deleteMutation.isPending}
                          onClick={() => deleteMutation.mutate(credential.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableCard>
          ) : null}
        </CardContent>
      ) : null}
    </Card>
  );
}
