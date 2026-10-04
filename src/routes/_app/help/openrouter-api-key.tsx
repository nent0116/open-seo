import { createFileRoute } from "@tanstack/react-router";
import {
  helpLinkClassName,
  SecretHelpPage,
} from "@/client/features/help/SecretHelpPage";

const OPENROUTER_KEYS_URL = "https://openrouter.ai/settings/keys";

export const Route = createFileRoute("/_app/help/openrouter-api-key")({
  component: OpenrouterApiKeyHelpPage,
});

function OpenrouterApiKeyHelpPage() {
  return (
    <SecretHelpPage
      title="OpenRouter APIキーを設定"
      intro={
        <>
          OpenSEOで機能を利用するには <code>OPENROUTER_API_KEY</code>{" "}
          シークレットの設定が必要です。設定するとアプリ内SEOエージェントSAMなどのAI機能を利用できます。この設定は任意で、OpenSEOのその他の機能は設定なしでも利用できます。
        </>
      }
      secretName="OPENROUTER_API_KEY"
      steps={
        <>
          <li>
            次のサイトでアカウントを作成します：{" "}
            <a
              className={helpLinkClassName}
              href="https://openrouter.ai"
              target="_blank"
              rel="noreferrer"
            >
              openrouter.ai
            </a>{" "}
            でクレジットを追加します（DataForSEOと同様の従量課金制）。
          </li>
          <li>
            次へ移動します：{" "}
            <a
              className={helpLinkClassName}
              href={OPENROUTER_KEYS_URL}
              target="_blank"
              rel="noreferrer"
            >
              OpenRouter API Keys
            </a>{" "}
            を開き、「Create API Key」をクリックします。
          </li>
          <li>
            キーを次の名前の <code>OPENROUTER_API_KEY</code>{" "}
            シークレットとして環境に保存します：
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                Dockerセルフホスト： <code>.env</code>
              </li>
              <li>Cloudflare：Workersの画面で設定します（下記参照）</li>
              <li>
                ローカル開発： <code>.env.local</code>
              </li>
            </ul>
          </li>
          <li>OpenSEOを再起動します。</li>
        </>
      }
      dashboardPasteStep="OpenRouter APIキーを貼り付けて保存します。"
      terminalPromptHint="入力を求められたらOpenRouter APIキーを貼り付けてください。"
    />
  );
}
