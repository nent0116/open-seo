import { useId, useState } from "react";
import { Info } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/client/components/ui/field";
import { Input } from "@/client/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";
import type { RankTrackingConfig } from "@/types/schemas/rank-tracking";
import {
  WEEKDAYS,
  browserTimeZoneLabel,
  describeSchedule,
  type LocalScheduleTime,
} from "./scheduleTime";

type Schedule = RankTrackingConfig["scheduleInterval"];

const SCHEDULE_ITEMS: { value: Schedule; label: string }[] = [
  { value: "daily", label: "毎日" },
  { value: "weekly", label: "毎週" },
  { value: "monthly", label: "毎月（月末）" },
  { value: "manual", label: "手動のみ" },
];

const WEEKDAY_ITEMS = WEEKDAYS.map((day, index) => ({
  value: index,
  label: day,
}));

type Props = {
  schedule: Schedule;
  onScheduleChange: (schedule: Schedule) => void;
  scheduleTime: LocalScheduleTime;
  onScheduleTimeChange: (scheduleTime: LocalScheduleTime) => void;
  /** AI visibility pauses tracking instead of offering a manual schedule. */
  allowManual?: boolean;
};

export function ScheduleField({
  schedule,
  onScheduleChange,
  scheduleTime,
  onScheduleTimeChange,
  allowManual = true,
}: Props) {
  const id = useId();
  const items = allowManual
    ? SCHEDULE_ITEMS
    : SCHEDULE_ITEMS.filter((item) => item.value !== "manual");
  const [showScheduleTime, setShowScheduleTime] = useState(false);

  return (
    <Field>
      <FieldLabel htmlFor={id}>スケジュール</FieldLabel>
      <Select
        items={items}
        value={schedule}
        onValueChange={(value) => {
          if (value) onScheduleChange(value);
        }}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {schedule !== "manual" && (
        <FieldDescription>
          {describeSchedule(schedule, scheduleTime)}
          {!showScheduleTime && (
            <>
              {" "}
              &middot;{" "}
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-xs"
                onClick={() => setShowScheduleTime(true)}
              >
                変更
              </Button>
            </>
          )}
        </FieldDescription>
      )}
      {schedule !== "manual" && showScheduleTime && (
        <>
          <div className="flex gap-2">
            {schedule === "weekly" && (
              <Select
                items={WEEKDAY_ITEMS}
                value={scheduleTime.weekday}
                onValueChange={(weekday) => {
                  if (weekday !== null) {
                    onScheduleTimeChange({ ...scheduleTime, weekday });
                  }
                }}
              >
                <SelectTrigger aria-label="曜日">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAY_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Input
              type="time"
              className="w-auto"
              aria-label="実行時刻"
              value={`${String(scheduleTime.hour).padStart(2, "0")}:${String(scheduleTime.minute).padStart(2, "0")}`}
              onChange={(e) => {
                const [hour, minute] = e.target.value.split(":").map(Number);
                // Clearing the field yields "", which has no time to keep.
                if (Number.isNaN(hour) || Number.isNaN(minute)) return;
                onScheduleTimeChange({ ...scheduleTime, hour, minute });
              }}
            />
          </div>
          <FieldDescription>
            現在のタイムゾーン： {browserTimeZoneLabel()}
          </FieldDescription>
        </>
      )}
      {schedule === "daily" && (
        <p className="flex items-start gap-1.5 text-xs text-warning">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          毎日のチェックは毎週の7倍のクレジットを使用します
        </p>
      )}
    </Field>
  );
}
