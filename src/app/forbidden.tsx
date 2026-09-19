import Link from "next/link";

export default function Forbidden() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <div className="font-mono text-5xl font-semibold text-alarm">403</div>
      <h1 className="text-xl font-semibold">บัญชีนี้ไม่มีสิทธิ์เปิดหน้านี้</h1>
      <p className="max-w-[36em] text-muted">ระบบตรวจสิทธิ์ที่ฝั่ง Server ไม่ใช่แค่ซ่อนเมนู ถ้าเปิด URL ตรง ๆ ก็จะถูกปฏิเสธแบบนี้</p>
      <Link href="/dashboard" className="btn btn-primary">กลับไป Dashboard</Link>
    </div>
  );
}
