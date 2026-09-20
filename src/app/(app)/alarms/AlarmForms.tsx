"use client";
import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "@/lib/validation";
import { ALARM_STATUS } from "@/lib/types";
import { getDictionary, type Locale } from "@/lib/i18n";
import { SubmitButton } from "@/components/client";
import { Field, FormError, Options } from "@/components/ui";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

function summary(state: FormState, t: ReturnType<typeof getDictionary>) {
  const n = Object.keys(state.errors ?? {}).filter((k) => k !== "form").length;
  return state.message ?? (n ? t.alarms.formErrorCount.replace("{count}", String(n)) : undefined);
}

export function AlarmCreateForm({
  action,
  machines,
  initial,
  locale = "th",
}: {
  action: Action;
  machines: [string, string][];
  initial: Record<string, string>;
  locale?: Locale;
}) {
  const t = getDictionary(locale);
  const [state, formAction] = useActionState(action, { values: initial });
  const v = state.values ?? initial;
  const e = state.errors ?? {};
  return (
    <form action={formAction} className="panel flex flex-col gap-4 p-5" noValidate>
      <FormError message={summary(state, t)} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.alarms.machine} name="machineId" error={e.machineId} required>
          <select className="input" id="machineId" name="machineId" defaultValue={v.machineId}>
            <Options list={machines} placeholder={t.alarms.machineSelect} />
          </select>
        </Field>
        <Field label={t.alarms.codeLabel} name="code" error={e.code} required hint={t.alarms.codeHint}>
          <input className="input font-mono" id="code" name="code" defaultValue={v.code} placeholder="E-201" maxLength={5} />
        </Field>
        <Field label={t.alarms.occurredAtLabel} name="occurredAt" error={e.occurredAt} required>
          <input className="input" id="occurredAt" name="occurredAt" type="datetime-local" defaultValue={v.occurredAt} />
        </Field>
        <div className="hidden sm:block" />
        <Field label={t.alarms.descriptionLabel} name="description" error={e.description} required full>
          <textarea className="input" id="description" name="description" defaultValue={v.description} placeholder={t.alarms.descriptionPlaceholder} maxLength={200} />
        </Field>
        <Field label={t.alarms.causeLabel} name="cause" error={e.cause} full>
          <textarea className="input" id="cause" name="cause" defaultValue={v.cause} placeholder={t.alarms.causePlaceholder} maxLength={500} />
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <Link href="/alarms" className="btn">{t.alarms.cancel}</Link>
        <SubmitButton>{t.alarms.submitCreate}</SubmitButton>
      </div>
    </form>
  );
}

export function AlarmUpdateForm({
  action,
  initial,
  locale = "th",
}: {
  action: Action;
  initial: Record<string, string>;
  locale?: Locale;
}) {
  const t = getDictionary(locale);
  const [state, formAction] = useActionState(action, { values: initial });
  const v = state.values ?? initial;
  const e = state.errors ?? {};
  const statusOptions = ALARM_STATUS.map((s) => [s, t.status[s] || s] as const);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormError message={summary(state, t)} />
      <p className="callout">{t.alarms.closeNote}</p>
      <Field label={t.alarms.changeStatusTo} name="status" error={e.status} required>
        <select className="input" id="status" name="status" defaultValue={v.status}>
          <Options list={statusOptions} />
        </select>
      </Field>
      <Field label={t.alarms.causeLabel} name="cause" error={e.cause}>
        <textarea className="input" id="cause" name="cause" defaultValue={v.cause} placeholder={t.alarms.causePlaceholder} maxLength={500} />
      </Field>
      <Field label={t.alarms.actionTakenLabel} name="action" error={e.action}>
        <textarea className="input" id="action" name="action" defaultValue={v.action} placeholder={t.alarms.actionTakenPlaceholder} maxLength={500} />
      </Field>
      <div className="flex justify-end">
        <SubmitButton>{t.alarms.saveStatus}</SubmitButton>
      </div>
    </form>
  );
}
