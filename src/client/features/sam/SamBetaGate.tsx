import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { GateCard } from "@/client/components/GateCard";
import { Button } from "@/client/components/ui/button";

/**
 * Shown on the chat route until the user opts into Sam. Sam is the OpenSEO
 * MCP plus skills wrapped in an in-app chat; the agents people already use
 * run that same toolset with a more mature harness, so the primary action
 * points there and Sam is the explicit fallback.
 */
export function SamBetaGate({ onContinue }: { onContinue: () => void }) {
  return (
    <GateCard
      icon={Sparkles}
      title="Samはベータ版です"
      description={
        <>
          <p>
            SamはOpenSEO MCPとスキルをチャット画面から利用できる機能です。Claude
            Code、ChatGPT、Grok
            Bot、Hermesなど普段お使いのAIエージェントでも、同じツールをより高性能な実行環境で利用できます。OpenSEOはそちらでの利用をおすすめします。
          </p>
          <p>Samも利用できますが、開発初期のため未完成な部分があります。</p>
        </>
      }
      actions={
        <>
          <Button size="lg" nativeButton={false} render={<Link to="/ai" />}>
            AIエージェントを設定
          </Button>
          <Button size="lg" variant="ghost" onClick={onContinue}>
            Samを使用する
          </Button>
        </>
      }
    />
  );
}
