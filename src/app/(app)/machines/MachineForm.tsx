"use client";
import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "@/lib/validation";
import { LOCATIONS, MACHINE_STATUS, MACHINE_TYPES } from "@/lib/types";
import { SubmitButton } from "@/components/client";
import { Field, FormError, Options } from "@/components/ui";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export function MachineForm({ action, initial, isNew, cancelHref }: { action: Action; initial: Record<string, string>; isNew: boolean; cancelHref: string }) {
  const [state, formAction] = useActionState(action, { values: initial });
  const v = state.values ?? initial;
  const e = state.errors ?? {};
  const errCount = Object.keys(e).filter((k) => k !== "form").length;

  return (
    <form action={formAction} className="panel flex flex-col gap-4 p-5" noValidate>
      <FormError message={state.message ?? (errCount ? `แก้ไขข้อมูล ${errCount} ช่องที่ไม่ถูกต้องก่อนบันทึก` : undefined)} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Machine ID" name="id" error={e.id} required hint={isNew ? "รูปแบบ M-000 และห้ามซ้ำกับเครื่องอื่น" : "แก้ไข Machine ID ไม่ได้"}>
          <input className="input font-mono" id="id" name="id" defaultValue={v.id} disabled={!isNew} placeholder="M-011" maxLength={5} aria-invalid={!!e.id} />
        </Field>
        <Field label="ชื่อเครื่อง" name="name" error={e.name} required>
          <input className="input" id="name" name="name" defaultValue={v.name} placeholder="เช่น CNC Lathe #3" maxLength={60} aria-invalid={!!e.name} />
        </Field>
        <Field label="ประเภท" name="type" error={e.type} required>
          <select className="input" id="type" name="type" defaultValue={v.type} aria-invalid={!!e.type}><Options list={MACHINE_TYPES} placeholder="เลือกประเภท" /></select>
        </Field>
        <Field label="Location" name="location" error={e.location} required>
          <select className="input" id="location" name="location" defaultValue={v.location} aria-invalid={!!e.location}><Options list={LOCATIONS} placeholder="เลือกไลน์ผลิต" /></select>
        </Field>
        <Field label="สถานะ" name="status" error={e.status} required>
          <select className="input" id="status" name="status" defaultValue={v.status} aria-invalid={!!e.status}><Options list={MACHINE_STATUS} /></select>
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <Link href={cancelHref} className="btn">ยกเลิก</Link>
        <SubmitButton>{isNew ? "เพิ่มเครื่องจักร" : "บันทึกการแก้ไข"}</SubmitButton>
      </div>
    </form>
  );
}
