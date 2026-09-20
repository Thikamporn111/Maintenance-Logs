"use client";
import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "@/lib/validation";
import { LOCATIONS, MACHINE_STATUS, MACHINE_TYPES } from "@/lib/types";
import { getDictionary, type Locale } from "@/lib/i18n";
import { SubmitButton } from "@/components/client";
import { Field, FormError, Options } from "@/components/ui";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export function MachineForm({
  action,
  initial,
  isNew,
  cancelHref,
  locale = "th",
}: {
  action: Action;
  initial: Record<string, string>;
  isNew: boolean;
  cancelHref: string;
  locale?: Locale;
}) {
  const t = getDictionary(locale);
  const [state, formAction] = useActionState(action, { values: initial });
  const v = state.values ?? initial;
  const e = state.errors ?? {};
  const errCount = Object.keys(e).filter((k) => k !== "form").length;

  const statusOptions = MACHINE_STATUS.map((s) => [s, t.status[s] || s] as const);

  return (
    <form action={formAction} className="panel flex flex-col gap-4 p-5" noValidate>
      <FormError message={state.message ?? (errCount ? t.machines.formErrorCount.replace("{count}", String(errCount)) : undefined)} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.machines.machineId} name="id" error={e.id} required hint={isNew ? t.machines.idHintNew : t.machines.idHintEdit}>
          <input className="input font-mono" id="id" name="id" defaultValue={v.id} disabled={!isNew} placeholder="M-011" maxLength={5} aria-invalid={!!e.id} />
        </Field>
        <Field label={t.machines.name} name="name" error={e.name} required>
          <input className="input" id="name" name="name" defaultValue={v.name} placeholder={t.machines.namePlaceholder} maxLength={60} aria-invalid={!!e.name} />
        </Field>
        <Field label={t.machines.type} name="type" error={e.type} required>
          <select className="input" id="type" name="type" defaultValue={v.type} aria-invalid={!!e.type}><Options list={MACHINE_TYPES} placeholder={t.machines.typePlaceholder} /></select>
        </Field>
        <Field label={t.machines.location} name="location" error={e.location} required>
          <select className="input" id="location" name="location" defaultValue={v.location} aria-invalid={!!e.location}><Options list={LOCATIONS} placeholder={t.machines.locationPlaceholder} /></select>
        </Field>
        <Field label={t.machines.status} name="status" error={e.status} required>
          <select className="input" id="status" name="status" defaultValue={v.status} aria-invalid={!!e.status}><Options list={statusOptions} /></select>
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <Link href={cancelHref} className="btn">{t.machines.cancel}</Link>
        <SubmitButton>{isNew ? t.machines.addSubmit : t.machines.saveChanges}</SubmitButton>
      </div>
    </form>
  );
}
