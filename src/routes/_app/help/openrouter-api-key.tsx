import { createFileRoute } from "@tanstack/react-router";
import {
  CommandBlock,
  helpLinkClassName,
  SecretHelpPage,
} from "@/client/features/help/SecretHelpPage";
import { pageHead } from "@/client/lib/pageHead";

const OPENROUTER_KEYS_URL = "https://openrouter.ai/settings/keys";

export const Route = createFileRoute("/_app/help/openrouter-api-key")({
  head: () => pageHead("OpenRouter API key"),
  component: OpenrouterApiKeyHelpPage,
});

function OpenrouterApiKeyHelpPage() {
  const accountStep = (
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
  );
  const keyStep = (
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
  );
  return (
    <SecretHelpPage
      title="OpenRouter APIキーを設定"
      intro={
        <>
          OpenSEOで機能を利用するには <code>OPENROUTER_API_KEY</code>{" "}
          シークレットの設定が必要です。設定するとアプリ内SEOエージェントSAMなどのAI機能を利用できます。この設定は任意で、OpenSEOのその他の機能は設定なしでも利用できます。
        </>
      }
      everyAppIntro="SAM, prompt suggestions and website research run on OpenRouter. On Every App the gateway holds the key once, for every app."
      secretName="OPENROUTER_API_KEY"
      steps={
        <>
          {accountStep}
          {keyStep}
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
      everyAppSteps={
        <>
          {accountStep}
          {keyStep}
          <li>
            An owner or admin runs this from the Every App checkout and pastes
            the key:
            <CommandBlock command="pnpm everyapp secret set OPENROUTER_API_KEY" />
          </li>
          <li>Reload OpenSEO.</li>
        </>
      }
      dashboardPasteStep="OpenRouter APIキーを貼り付けて保存します。"
      terminalPromptHint="入力を求められたらOpenRouter APIキーを貼り付けてください。"
    />
  );
}
