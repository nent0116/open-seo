import type { FormEvent } from "react";
import { cn } from "cn";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/client/components/ui/tooltip";
import { sortBy } from "remeda";
import { Button } from "@/client/components/ui/button";
import { Card, CardContent } from "@/client/components/ui/card";
import { Checkbox } from "@/client/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/client/components/ui/field";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/client/components/ui/combobox";
import {
  WEB_SEARCH_COUNTRY_CODES,
  ignoresWebSearchCountry,
  supportsWebSearchCountry,
} from "@/shared/prompt-search-countries";
import { Textarea } from "@/client/components/ui/textarea";
import {
  formatCountryLabel,
  formatModelLabel,
} from "@/shared/prompt-explorer-labels";
import {
  PROMPT_EXPLORER_MAX_PROMPT_LENGTH,
  PROMPT_EXPLORER_MODELS,
  type PromptExplorerModel,
  type WebSearchCountrySelection,
} from "@/types/schemas/ai-search";

type FormValues = {
  prompt: string;
  highlightBrand: string;
  models: PromptExplorerModel[];
  webSearch: boolean;
  webSearchCountryCode: WebSearchCountrySelection;
};

type Props = {
  form: FormValues;
  onPromptChange: (value: string) => void;
  onHighlightBrandChange: (value: string) => void;
  onModelsChange: (value: PromptExplorerModel[]) => void;
  onWebSearchChange: (value: boolean) => void;
  onCountryChange: (value: WebSearchCountrySelection) => void;
  onSubmit: (event: FormEvent) => void;
  validationError: string | null;
};

const COUNTRY_ITEMS: Array<{
  value: WebSearchCountrySelection;
  label: string;
}> = [
  { value: "default", label: "国を指定しない" },
  ...sortBy(
    WEB_SEARCH_COUNTRY_CODES.map((code) => ({
      value: code,
      label: formatCountryLabel(code),
    })),
    (item) => item.label,
  ),
];

function getCountryNote(model: PromptExplorerModel, form: FormValues) {
  if (!form.webSearch || form.webSearchCountryCode === "default") return null;
  const label = formatModelLabel(model);
  if (ignoresWebSearchCountry(model)) {
    return `${label} can’t specify a country.`;
  }
  if (supportsWebSearchCountry(model, form.webSearchCountryCode)) return null;
  return `${label} can’t specify this country.`;
}

export function PromptExplorerForm({
  form,
  onPromptChange,
  onHighlightBrandChange,
  onModelsChange,
  onWebSearchChange,
  onCountryChange,
  onSubmit,
  validationError,
}: Props) {
  const toggleModel = (model: PromptExplorerModel) => {
    if (form.models.includes(model)) {
      onModelsChange(form.models.filter((m) => m !== model));
    } else {
      onModelsChange([...form.models, model]);
    }
  };

  const countryItems = COUNTRY_ITEMS.filter(
    (item) =>
      item.value === "default" ||
      item.value === form.webSearchCountryCode ||
      form.models.some((model) => supportsWebSearchCountry(model, item.value)),
  );
  // Every model, not only selected ones: a model that becomes selectable only
  // after a country change must not be checkable while it would be skipped.
  const unsupportedModels =
    form.webSearch && form.webSearchCountryCode !== "default"
      ? PROMPT_EXPLORER_MODELS.filter(
          (model) =>
            !ignoresWebSearchCountry(model) &&
            !supportsWebSearchCountry(model, form.webSearchCountryCode),
        )
      : [];
  const supportedModels = form.models.filter(
    (model) => !unsupportedModels.includes(model),
  );

  const promptCharCount = form.prompt.length;
  const promptOverLimit = promptCharCount > PROMPT_EXPLORER_MAX_PROMPT_LENGTH;

  return (
    <Card>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          <Field>
            <FieldLabel htmlFor="prompt-explorer-prompt">プロンプト</FieldLabel>
            <Textarea
              id="prompt-explorer-prompt"
              className="resize-none"
              rows={3}
              value={form.prompt}
              maxLength={PROMPT_EXPLORER_MAX_PROMPT_LENGTH + 50}
              onChange={(event) => onPromptChange(event.target.value)}
              aria-invalid={promptOverLimit ? true : undefined}
              autoFocus
            />
            <FieldDescription className="flex items-center justify-between">
              <span>顧客がAIに尋ねそうな内容を入力します。</span>
              <span
                className={cn(
                  "tabular-nums",
                  promptOverLimit && "font-medium text-destructive",
                )}
              >
                {promptCharCount}/{PROMPT_EXPLORER_MAX_PROMPT_LENGTH}
              </span>
            </FieldDescription>
          </Field>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="prompt-explorer-brand">
                ブランドを強調（任意）
              </FieldLabel>
              <Input
                id="prompt-explorer-brand"
                value={form.highlightBrand}
                onChange={(event) => onHighlightBrandChange(event.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              <FieldDescription>
                各モデルがこのブランドに言及したか表示します。
              </FieldDescription>
            </Field>

            <FieldSet className="gap-0">
              <FieldLegend variant="label" className="mb-2">
                モデル
              </FieldLegend>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1.5">
                {PROMPT_EXPLORER_MODELS.map((model) => {
                  const unsupported = unsupportedModels.includes(model);
                  const countryNote = getCountryNote(model, form);
                  return (
                    <div key={model} className="flex items-center gap-1.5">
                      <Label
                        className={cn(
                          "font-normal",
                          unsupported &&
                            "cursor-not-allowed text-muted-foreground",
                        )}
                      >
                        <Checkbox
                          checked={form.models.includes(model) && !unsupported}
                          disabled={unsupported}
                          onCheckedChange={() => toggleModel(model)}
                        />
                        {formatModelLabel(model)}
                      </Label>
                      {countryNote ? (
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <button
                                type="button"
                                aria-label={`About ${formatModelLabel(model)} and country targeting`}
                                className="text-muted-foreground"
                              />
                            }
                          >
                            <Info className="size-3.5" />
                          </TooltipTrigger>
                          <TooltipContent>{countryNote}</TooltipContent>
                        </Tooltip>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </FieldSet>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <div className="flex flex-wrap items-center gap-3">
              <Label className="font-normal">
                <Checkbox
                  checked={form.webSearch}
                  onCheckedChange={onWebSearchChange}
                />
                Web検索を許可
              </Label>
              <Combobox
                items={countryItems}
                value={
                  COUNTRY_ITEMS.find(
                    (item) => item.value === form.webSearchCountryCode,
                  ) ?? null
                }
                itemToStringLabel={(item) => item.label}
                autoHighlight
                onValueChange={(item) => {
                  if (item) onCountryChange(item.value);
                }}
                disabled={!form.webSearch}
              >
                <ComboboxInput
                  aria-label="Web検索の対象国"
                  placeholder="国を検索"
                  className="w-full sm:w-80"
                />
                <ComboboxContent>
                  <ComboboxEmpty>一致する対応国がありません。</ComboboxEmpty>
                  <ComboboxList>
                    {(item: (typeof COUNTRY_ITEMS)[number]) => (
                      <ComboboxItem key={item.value} value={item}>
                        {item.label}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      aria-label="国指定について"
                      className="text-muted-foreground"
                    />
                  }
                >
                  <Info className="size-4" />
                </TooltipTrigger>
                <TooltipContent>
                  対応しているモデルでは、指定した国をWeb検索の参考にします。検索せずに回答する場合もあります。すべての選択済みモデルを実行するには未設定にしてください。
                </TooltipContent>
              </Tooltip>
            </div>
            <Button
              type="submit"
              className="px-6"
              disabled={supportedModels.length === 0}
            >
              {supportedModels.length}モデルを実行
            </Button>
          </div>

          {validationError ? (
            <p role="alert" className="text-sm text-destructive">
              {validationError}
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
