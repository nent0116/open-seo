import type { KeywordIntent } from "@/types/keywords";
import { Badge } from "@/client/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/client/components/ui/tooltip";

const VARIANTS: Record<
  KeywordIntent,
  "info" | "warning" | "success" | "soft" | "secondary"
> = {
  informational: "info",
  commercial: "warning",
  transactional: "success",
  navigational: "soft",
  unknown: "secondary",
};

const SHORT_LABELS: Record<KeywordIntent, string> = {
  informational: "情報",
  commercial: "比較",
  transactional: "購入",
  navigational: "案内",
  unknown: "?",
};

/** Full intent labels, shared with the keyword filters so both stay in sync. */
export const INTENT_LABELS: Record<KeywordIntent, string> = {
  informational: "情報収集型",
  commercial: "比較検討型",
  transactional: "取引型",
  navigational: "案内型",
  unknown: "不明",
};

const DESCRIPTIONS: Record<
  KeywordIntent,
  { label: string; description: string }
> = {
  informational: {
    label: INTENT_LABELS.informational,
    description:
      "検索者は情報や回答を求めています。解説記事、ガイド、比較を補助するコンテンツに適しています。",
  },
  commercial: {
    label: INTENT_LABELS.commercial,
    description:
      "検索者は購入前に選択肢を調べています。比較、代替案、製品紹介ページにつながる購入意図として扱います。",
  },
  transactional: {
    label: INTENT_LABELS.transactional,
    description:
      "検索者は購入などの行動を起こす準備ができています。明確な提案、料金、無料体験、申込み導線を優先します。",
  },
  navigational: {
    label: INTENT_LABELS.navigational,
    description:
      "検索者は特定のサイト、ブランド、ページを探しています。期待される遷移先と一致するページが評価されやすい検索です。",
  },
  unknown: {
    label: INTENT_LABELS.unknown,
    description:
      "このキーワードの検索意図は取得できませんでした。この表示だけでコンテンツ戦略を判断しないでください。",
  },
};

export function IntentBadge({ intent }: { intent: KeywordIntent }) {
  const details = DESCRIPTIONS[intent];

  return (
    <Tooltip>
      <TooltipTrigger
        delay={0}
        render={
          <Badge
            variant={VARIANTS[intent]}
            tabIndex={0}
            className="h-6 min-w-11 cursor-help font-semibold"
          />
        }
        aria-label={`検索意図：${details.label}`}
      >
        {SHORT_LABELS[intent]}
      </TooltipTrigger>
      <TooltipContent className="flex-col items-start gap-1">
        <span className="font-semibold">{details.label}</span>
        <span>{details.description}</span>
      </TooltipContent>
    </Tooltip>
  );
}
