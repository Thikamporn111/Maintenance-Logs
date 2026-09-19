import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <div className="font-mono text-5xl font-semibold text-muted">404</div>
      <h1 className="text-xl font-semibold">ไม่พบหน้าหรือรายการที่ต้องการ</h1>
      <p className="text-muted">รายการอาจถูกลบไปแล้ว หรือเลขที่ในลิงก์ไม่ถูกต้อง</p>
      <Link href="/dashboard" className="btn btn-primary">กลับไป Dashboard</Link>
    </div>
  );
}
