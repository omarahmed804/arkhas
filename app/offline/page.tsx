import type { Metadata } from "next";
import { WifiOff } from "lucide-react";

export const metadata: Metadata = { title: "مفيش إنترنت" };

export default function OfflinePage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-24 text-center">
      <WifiOff className="mx-auto mb-4 size-12 text-slate-400" />
      <h1 className="text-xl font-black">إنت أوفلاين دلوقتي</h1>
      <p className="mt-2 text-sm text-slate-500">الأسعار محتاجة إنترنت عشان تكون محدّثة. اتصل بالنت وجرب تاني.</p>
    </div>
  );
}
