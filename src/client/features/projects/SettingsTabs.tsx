import { NavTab, NavTabs } from "@/client/components/NavTabs";

const tabs = [
  { to: "/p/$projectId/settings" as const, label: "一般", exact: true },
  { to: "/p/$projectId/settings/integrations" as const, label: "連携" },
];

export function SettingsTabs({ projectId }: { projectId: string }) {
  return (
    <NavTabs label="プロジェクト設定の項目">
      {tabs.map((tab) => (
        <NavTab
          key={tab.to}
          to={tab.to}
          params={{ projectId }}
          activeOptions={{ exact: tab.exact ?? false }}
        >
          {tab.label}
        </NavTab>
      ))}
    </NavTabs>
  );
}
