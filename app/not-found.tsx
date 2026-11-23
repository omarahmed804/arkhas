import Link from "next/link";
import { T } from "@/components/LangProvider";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <p className="text-6xl font-black text-brand-600">404</p>
      <h1 className="mt-2 text-2xl font-black"><T>الصفحة مش موجودة</T></h1>
      <Link href="/" className="btn-primary mt-6"><T>ارجع للرئيسية</T></Link>
    </div>
  );
}
