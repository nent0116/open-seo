import { Link } from "@tanstack/react-router";
import { Globe, Search } from "lucide-react";
import { EmptyState } from "@/client/components/EmptyState";
import { RecentSearches } from "@/client/components/RecentSearches";
import { LOCATIONS } from "@/client/features/keywords/utils";
import type { KeywordResearchControllerState } from "./types";

type Props = {
  controller: KeywordResearchControllerState;
  projectId: string;
};

export function KeywordResearchEmptyState({ controller, projectId }: Props) {
  // The page renders loading and error states before this component.
  if (controller.hasSearched) {
    return <NoResultsState controller={controller} />;
  }

  return <SearchHistoryState controller={controller} projectId={projectId} />;
}

function NoResultsState({
  controller,
}: {
  controller: KeywordResearchControllerState;
}) {
  const { lastSearchKeyword, lastSearchLocationCode } = controller;

  return (
    <div className="mx-auto w-full max-w-2xl pt-1">
      <EmptyState
        variant="card"
        icon={Globe}
        title="この検索条件のキーワードデータが不足しています"
        description={
          <>
            「
            <span className="font-medium text-foreground">
              {lastSearchKeyword}
            </span>
            」について、
            <span className="font-medium text-foreground">
              {LOCATIONS[lastSearchLocationCode] || "この地域"}
            </span>
            のキーワード候補が見つかりませんでした。
          </>
        }
      />
    </div>
  );
}

function SearchHistoryState({
  controller,
  projectId,
}: {
  controller: KeywordResearchControllerState;
  projectId: string;
}) {
  return (
    <div className="pt-1">
      <RecentSearches
        items={controller.history}
        loaded={controller.historyLoaded}
        onRemove={controller.removeHistoryItem}
        emptyIcon={Search}
        emptyTitle="キーワードを入力して始めましょう"
        emptyDescription="キーワードを検索すると、検索ボリューム、難易度、クリック単価、関連候補を確認できます。"
        getTitle={(item) => item.keyword}
        getSubtitle={(item) => item.locationName}
        renderLink={(item, props) => (
          <Link
            from="/p/$projectId/keywords"
            to="/p/$projectId/keywords"
            params={{ projectId }}
            search={{
              q: item.keyword,
              loc: item.locationCode,
              locName: item.localLocationName,
              grp: controller.preferredGroupKeywords ? true : undefined,
            }}
            replace
            {...props}
          />
        )}
      />
    </div>
  );
}
