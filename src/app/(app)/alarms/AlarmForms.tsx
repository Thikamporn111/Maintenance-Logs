"use client";
import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "@/lib/validation";
import { ALARM_STATUS } from "@/lib/types";
import { SubmitButton } from "@/components/client";
import { Field, FormError, Options } from "@/components/ui";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

function summary(state: FormState) {
  const n = Object.keys(state.errors ?? {}).filter((k) => k !== "form").length;
  return state.message ?? (n ? `แก้ไขข้อมูล ${n} ช่องที่ไม่ถูกต้องก่อนบันทึก` : undefined);
}

export function AlarmCreateForm({ action, machines, initial }: { action: Action; machines: [string, string][]; initial: Record<string, string> }) {
  const [state, formAction] = useActionState(action, { values: initial });
  const v = state.values ?? initial;
  const e = state.errors ?? {};
  return (
    <form action={formAction} className="panel flex flex-col gap-4 p-5" noValidate>
      <FormError message={summary(state)} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="เครื่องจักร" name="machineId" error={e.machineId} required>
          <select className="input" id="machineId" name="machineId" defaultValue={v.machineId}><Options list={machines} placeholder="เลือกเครื่องจักร" /></select>
        </Field>
        <Field label="Alarm Code" name="code" error={e.code} required hint="รูปแบบ E-000 ตามรหัสจาก PLC/HMI">
          <input className="input font-mono" id="code" name="code" defaultValue={v.code} placeholder="E-201" maxLength={5} />
        </Field>
        <Field label="วันที่/เวลาเกิด" name="occurredAt" error={e.occurredAt} required>
          <input className="input" id="occurredAt" name="occurredAt" type="datetime-local" defaultValue={v.occurredAt} />
        </Field>
        <div className="hidden sm:block" />
        <Field label="รายละเอียด Alarm" name="description" error={e.description} required full>
          <textarea className="input" id="description" name="description" defaultValue={v.description} placeholder="เช่น Spindle overload" maxLength={200} />
        </Field>
        <Field label="สาเหตุ (ถ้าทราบ)" name="cause" error={e.cause} full>
          <textarea className="input" id="cause" name="cause" defaultValue={v.cause} maxLength={500} />
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <Link href="/alarms" className="btn">ยกเลิก</Link>
        <SubmitButton>บันทึก Alarm</SubmitButton>
      </div>
    </form>
  );
}

export function AlarmUpdateForm({ action, initial }: { action: Action; initial: Record<string, string> }) {
  const [state, formAction] = useActionState(action, { values: initial });
  const v = state.values ?? initial;
  const e = state.errors ?? {};
  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormError message={summary(state)} />
      <p className="callout">การปิด Alarm ต้องระบุ <b>สาเหตุ</b> และ <b>Action Taken</b> ระบบจะบันทึกผู้ปิดและเวลาให้อัตโนมัติ</p>
      <Field label="เปลี่ยนสถานะเป็น" name="status" error={e.status} required>
        <select className="input" id="status" name="status" defaultValue={v.status}><Options list={ALARM_STATUS} /></select>
      </Field>
      <Field label="สาเหตุ (Cause)" name="cause" error={e.cause}>
        <textarea className="input" id="cause" name="cause" defaultValue={v.cause} placeholder="เช่น Dull cutting tool" maxLength={500} />
      </Field>
      <Field label="Action Taken" name="action" error={e.action}>
        <textarea className="input" id="action" name="action" defaultValue={v.action} placeholder="สิ่งที่ทำเพื่อแก้ไข" maxLength={500} />
      </Field>
      <div className="flex justify-end"><SubmitButton>บันทึกสถานะ</SubmitButton></div>
    </form>
  );
}
