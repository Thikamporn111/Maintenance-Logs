"use client";
import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "@/lib/validation";
import { MNT_STATUS, MNT_TYPES } from "@/lib/types";
import { SubmitButton } from "@/components/client";
import { Field, FormError, Options } from "@/components/ui";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;
type Opt = [string, string];

export function MaintenanceForm({ action, initial, machines, technicians, alarms, submitLabel }: {
  action: Action; initial: Record<string, string>; machines: Opt[]; technicians: Opt[]; alarms: Opt[]; submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, { values: initial });
  const v = state.values ?? initial;
  const e = state.errors ?? {};
  const n = Object.keys(e).filter((k) => k !== "form").length;

  return (
    <form action={formAction} className="panel flex flex-col gap-4 p-5" noValidate>
      <FormError message={state.message ?? (n ? `แก้ไขข้อมูล ${n} ช่องที่ไม่ถูกต้องก่อนบันทึก` : undefined)} />
      {v.planId && (
        <p className="callout">ใบงานนี้มาจากแผน <b className="font-mono">{v.planId}</b> เมื่อเปลี่ยนสถานะเป็น <b>Done</b> ระบบจะบันทึกวันที่ทำ และเลื่อนรอบถัดไปของแผนให้อัตโนมัติ</p>
      )}
      <input type="hidden" name="planId" value={v.planId ?? ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="เครื่องจักร" name="machineId" error={e.machineId} required>
          <select className="input" id="machineId" name="machineId" defaultValue={v.machineId}><Options list={machines} placeholder="เลือกเครื่องจักร" /></select>
        </Field>
        <Field label="ช่างผู้รับผิดชอบ" name="technicianId" error={e.technicianId} required>
          <select className="input" id="technicianId" name="technicianId" defaultValue={v.technicianId}><Options list={technicians} placeholder="เลือกช่าง" /></select>
        </Field>
        <Field label="ประเภทงาน" name="type" error={e.type} required>
          <select className="input" id="type" name="type" defaultValue={v.type}><Options list={MNT_TYPES} /></select>
        </Field>
        <Field label="วันที่/เวลา" name="date" error={e.date} required>
          <input className="input" id="date" name="date" type="datetime-local" defaultValue={v.date} />
        </Field>
        <Field label="สถานะงาน" name="status" error={e.status} required>
          <select className="input" id="status" name="status" defaultValue={v.status}><Options list={MNT_STATUS} /></select>
        </Field>
        <Field label="อ้างอิง Alarm" name="alarmId" error={e.alarmId}>
          <select className="input" id="alarmId" name="alarmId" defaultValue={v.alarmId}><Options list={alarms} placeholder="ไม่มี" /></select>
        </Field>
        <Field label="ปัญหา (Problem)" name="problem" error={e.problem} required full>
          <textarea className="input" id="problem" name="problem" defaultValue={v.problem} maxLength={1000} />
        </Field>
        <Field label="การแก้ไข (Action Taken)" name="action" error={e.action} full hint="จำเป็นเมื่อสถานะเป็น Waiting Part หรือ Done">
          <textarea className="input" id="action" name="action" defaultValue={v.action} maxLength={1000} />
        </Field>
      </div>
      {e.planId && <p className="err">{e.planId}</p>}
      <div className="flex justify-end gap-2">
        <Link href="/maintenance" className="btn">ยกเลิก</Link>
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
