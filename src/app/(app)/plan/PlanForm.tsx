"use client";
import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "@/lib/validation";
import { getDictionary, type Locale } from "@/lib/i18n";
import { SubmitButton } from "@/components/client";
import { Field, FormError, Options } from "@/components/ui";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;
type Opt = [string, string];

export const FREQ_OPTIONS: Opt[] = [
  ["7", "ทุกสัปดาห์ (7 วัน)"], ["14", "ทุก 2 สัปดาห์ (14 วัน)"], ["30", "ทุกเดือน (30 วัน)"],
  ["90", "ทุกไตรมาส (90 วัน)"], ["180", "ทุก 6 เดือน (180 วัน)"], ["365", "ทุกปี (365 วัน)"],
];

export function PlanForm({
  action,
  initial,
  machines,
  technicians,
  isNew,
  cancelHref,
  locale = "th",
}: {
  action: Action;
  initial: Record<string, string>;
  machines: Opt[];
  technicians: Opt[];
  isNew: boolean;
  cancelHref: string;
  locale?: Locale;
}) {
  const t = getDictionary(locale);
  const [state, formAction] = useActionState(action, { values: initial });
  const v = state.values ?? initial;
  const e = state.errors ?? {};
  const n = Object.keys(e).filter((k) => k !== "form").length;

  const freqOpts = (["7", "14", "30", "90", "180", "365"] as const).map((d) => [
    d,
    t.plan.freqOptions[d] || d,
  ] as const);

  return (
    <form action={formAction} className="panel flex flex-col gap-4 p-5" noValidate>
      <FormError message={state.message ?? (n ? t.plan.formErrorCount.replace("{count}", String(n)) : undefined)} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.machines.title} name="machineId" error={e.machineId} required>
          <select className="input" id="machineId" name="machineId" defaultValue={v.machineId}>
            <Options list={machines} placeholder={t.alarms.machineSelect} />
          </select>
        </Field>
        <Field label={t.maintenance.technicianResponsible} name="technicianId" error={e.technicianId} required>
          <select className="input" id="technicianId" name="technicianId" defaultValue={v.technicianId}>
            <Options list={technicians} placeholder={t.maintenance.technicianSelect} />
          </select>
        </Field>
        <Field label={t.plan.taskLabel} name="task" error={e.task} required full>
          <input className="input" id="task" name="task" defaultValue={v.task} placeholder={t.plan.taskPlaceholder} maxLength={80} />
        </Field>
        <Field label={t.plan.freqLabel} name="intervalDays" error={e.intervalDays} required>
          <select className="input" id="intervalDays" name="intervalDays" defaultValue={v.intervalDays}>
            <Options list={freqOpts} />
          </select>
        </Field>
        <Field label={t.plan.nextDueLabel} name="nextDue" error={e.nextDue} required>
          <input className="input" id="nextDue" name="nextDue" type="date" defaultValue={v.nextDue} />
        </Field>
        <Field label={t.plan.lastDoneLabel} name="lastDone" error={e.lastDone} hint={t.plan.lastDoneHint}>
          <input className="input" id="lastDone" name="lastDone" type="date" defaultValue={v.lastDone} />
        </Field>
        <div className="hidden sm:block" />
        <Field label={t.plan.checklistLabel} name="checklist" error={e.checklist} full hint={t.plan.checklistHint}>
          <textarea className="input" id="checklist" name="checklist" defaultValue={v.checklist} maxLength={1000} />
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <Link href={cancelHref} className="btn">{t.plan.cancel}</Link>
        <SubmitButton>{isNew ? t.plan.submitAdd : t.plan.saveChanges}</SubmitButton>
      </div>
    </form>
  );
}
