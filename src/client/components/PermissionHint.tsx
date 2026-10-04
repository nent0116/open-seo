import { cn } from "cn";

/** Shown where a missing permission would otherwise leave a card or step empty. */
export function PermissionHint({
  action,
  className,
}: {
  action: string;
  className?: string;
}) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      組織の所有者または管理者に「{action}」を依頼してください。
    </p>
  );
}
