"use client";
import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "@/lib/validation";
import { SubmitButton } from "@/components/client";
import { Field, FormError, Options } from "@/components/ui";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;
type Opt = [string, string];

export const FREQ_OPTIONS: Opt[] = [
  ["7", "ทุกสัปดาห์ (7 วัน)"], ["14", "ทุก 2 สัปดาห์ (14 วัน)"], ["30", "ทุกเดือน (30 วัน)"],
  ["90", "ทุกไตรมาส (90 วัน)"], ["180", "ทุก 6 เดือน (180 วัน)"], ["365", "ทุกปี (365 วัน)"],
];

export function PlanForm({ action, initial, machines, technicians, isNew, cancelHref }: {
  action: Action; initial: Record<string, string>; machines: Opt[]; technicians: Opt[]; isNew: boolean; cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, { values: initial });
  const v = state.values ?? initial;
  const e = state.errors ?? {};
  const n = Object.keys(e).filter((k) => k !== "form").length;

  return (
    <form action={formAction} className="panel flex flex-col gap-4 p-5" noValidate>
      <FormError message={state.message ?? (n ? `แก้ไขข้อมูล ${n} ช่องที่ไม่ถูกต้องก่อนบันทึก` : undefined)} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="เครื่องจักร" name="machineId" error={e.machineId} required>
          <select className="input" id="machineId" name="machineId" defaultValue={v.machineId}><Options list={machines} placeholder="เลือกเครื่องจักร" /></select>
        </Field>
        <Field label="ช่างผู้รับผิดชอบ" name="technicianId" error={e.technicianId} required>
          <select className="input" id="technicianId" name="technicianId" defaultValue={v.technicianId}><Options list={technicians} placeholder="เลือกช่าง" /></select>
        </Field>
        <Field label="ชื่องาน PM" name="task" error={e.task} required full>
          <input className="input" id="task" name="task" defaultValue={v.task} placeholder="เช่น เปลี่ยนไส้กรองน้ำมันไฮดรอลิก" maxLength={80} />
        </Field>
        <Field label="ความถี่" name="intervalDays" error={e.intervalDays} required>
          <select className="input" id="intervalDays" name="intervalDays" defaultValue={v.intervalDays}><Options list={FREQ_OPTIONS} /></select>
        </Field>
        <Field label="ครบกำหนดครั้งถัดไป" name="nextDue" error={e.nextDue} required>
          <input className="input" id="nextDue" name="nextDue" type="date" defaultValue={v.nextDue} />
        </Field>
        <Field label="ทำครั้งล่าสุด" name="lastDone" error={e.lastDone} hint="เว้นว่างได้ถ้าเป็นแผนใหม่">
          <input className="input" id="lastDone" name="lastDone" type="date" defaultValue={v.lastDone} />
        </Field>
        <div className="hidden sm:block" />
        <Field label="Checklist" name="checklist" error={e.checklist} full hint="หนึ่งบรรทัดต่อหนึ่งข้อ ช่างจะเห็นในใบงาน">
          <textarea className="input" id="checklist" name="checklist" defaultValue={v.checklist} maxLength={1000} />
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <Link href={cancelHref} className="btn">ยกเลิก</Link>
        <SubmitButton>{isNew ? "เพิ่มแผน" : "บันทึกการแก้ไข"}</SubmitButton>
      </div>
    </form>
  );
}
