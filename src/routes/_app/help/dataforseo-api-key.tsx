import { createFileRoute } from "@tanstack/react-router";
import {
  CommandBlock,
  helpLinkClassName,
  SecretHelpPage,
} from "@/client/features/help/SecretHelpPage";
import { pageHead } from "@/client/lib/pageHead";

const DATAFORSEO_API_ACCESS_URL = "https://app.dataforseo.com/api-access";

export const Route = createFileRoute("/_app/help/dataforseo-api-key")({
  head: () => pageHead("DataForSEO API key"),
  component: DataforseoApiKeyHelpPage,
});

function DataforseoApiKeyHelpPage() {
  const requestStep = (
    <li>
      次へ移動します：{" "}
      <a
        className={helpLinkClassName}
        href={DATAFORSEO_API_ACCESS_URL}
        target="_blank"
        rel="noreferrer"
      >
        DataForSEO API Access
      </a>{" "}
      を開き、メールでAPI認証情報を申請します。
    </li>
  );
  const encodeStep = (
    <li>
      DataForSEOのログイン名とAPIパスワードを次の形式でBase64エンコードします：
      <CommandBlock command="printf '%s' 'YOUR_LOGIN:YOUR_PASSWORD' | base64" />
    </li>
  );
  return (
    <SecretHelpPage
      title="DataForSEO APIキーを設定"
      intro={
        <>
          OpenSEOで機能を利用するには <code>DATAFORSEO_API_KEY</code>{" "}
          シークレットの設定が必要です。設定後にキーワード、ドメイン、SEOデータのワークフローを実行できます。
        </>
      }
      everyAppIntro="OpenSEO's keyword, domain, backlink and rank data comes from DataForSEO. On Every App the gateway holds the key once, for every app."
      secretName="DATAFORSEO_API_KEY"
      steps={
        <>
          {requestStep}
          {encodeStep}
          <li>
            出力を次の名前の <code>DATAFORSEO_API_KEY</code>{" "}
            シークレットとして環境に保存します。
          </li>
        </>
      }
      everyAppSteps={
        <>
          {requestStep}
          {encodeStep}
          <li>
            An owner or admin runs this from the Every App checkout and pastes
            the value:
            <CommandBlock command="pnpm everyapp secret set DATAFORSEO_API_KEY" />
          </li>
          <li>Reload OpenSEO: it uses the key on its next request.</li>
        </>
      }
      dashboardPasteStep="上のターミナルコマンドで作成したBase64値を貼り付けて保存します。"
      terminalPromptHint={
        <>
          入力を求められたら、次のBase64値を使用します：{" "}
          <code>login:password</code> 。
        </>
      }
    />
  );
}
