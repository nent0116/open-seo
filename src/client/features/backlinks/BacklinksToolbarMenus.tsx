import { ChevronDown, Gauge, Link2, MoreHorizontal } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";
import { Spinner } from "@/client/components/ui/spinner";
import { DEFAULT_BACKLINKS_SPAM_THRESHOLD } from "@/types/schemas/backlinks";

export function BacklinksBestLinksMenu({
  hideSpam,
  onHideSpamChange,
}: {
  hideSpam: boolean;
  onHideSpamChange: (hideSpam: boolean) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
        <Link2 data-icon="inline-start" />
        高品質リンク： {hideSpam ? "オン" : "オフ"}
        <ChevronDown data-icon="inline-end" className="opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuRadioGroup
          value={hideSpam ? "best" : "all"}
          onValueChange={(value) => onHideSpamChange(value === "best")}
        >
          <DropdownMenuRadioItem value="best">
            <span>
              <span className="block">高品質リンクのみ</span>
              <span className="block text-xs text-muted-foreground">
                スコアが {DEFAULT_BACKLINKS_SPAM_THRESHOLD} 未満または不明
              </span>
            </span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="all">
            <span>
              <span className="block">すべてのリンク（スパムを含む）</span>
              <span className="block text-xs text-muted-foreground">
                スコア {DEFAULT_BACKLINKS_SPAM_THRESHOLD} 以上を含む
              </span>
            </span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function BacklinksActionsMenu({
  isLoadingRatings,
  loadRatings,
  ratableDomains,
}: {
  isLoadingRatings: boolean;
  loadRatings: (domains: string[]) => void | Promise<void>;
  ratableDomains: string[];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="被リンク表の操作"
            title="被リンク表の操作"
          />
        }
      >
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem
          onClick={() => void loadRatings(ratableDomains)}
          disabled={isLoadingRatings}
          title="表内の各ドメインについてAhrefs Domain Ratingを取得"
        >
          {isLoadingRatings ? <Spinner /> : <Gauge />}
          Ahrefs DR
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
