import { createFileRoute } from "@tanstack/react-router";
import {
  CommandBlock,
  helpLinkClassName,
  SecretHelpPage,
} from "@/client/features/help/SecretHelpPage";

const DATAFORSEO_API_ACCESS_URL = "https://app.dataforseo.com/api-access";

export const Route = createFileRoute("/_app/help/dataforseo-api-key")({
  component: DataforseoApiKeyHelpPage,
});

function DataforseoApiKeyHelpPage() {
  return (
    <SecretHelpPage
      title="DataForSEO APIキーを設定"
      intro={
        <>
          OpenSEOで機能を利用するには <code>DATAFORSEO_API_KEY</code>{" "}
          シークレットの設定が必要です。設定後にキーワード、ドメイン、SEOデータのワークフローを実行できます。
        </>
      }
      secretName="DATAFORSEO_API_KEY"
      steps={
        <>
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
          <li>
            DataForSEOのログイン名とAPIパスワードを次の形式でBase64エンコードします：
            <CommandBlock command="printf '%s' 'YOUR_LOGIN:YOUR_PASSWORD' | base64" />
          </li>
          <li>
            出力を次の名前の <code>DATAFORSEO_API_KEY</code>{" "}
            シークレットとして環境に保存します。
          </li>
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
