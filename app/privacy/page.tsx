import type { Metadata } from "next";
import { PrivacyContent } from "@/components/InfoPages";

export const metadata: Metadata = { title: "سياسة الخصوصية" };

export default function Page() {
  return <PrivacyContent />;
}
