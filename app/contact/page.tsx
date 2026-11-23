import type { Metadata } from "next";
import { ContactContent } from "@/components/InfoPages";

export const metadata: Metadata = { title: "تواصل معنا" };

export default function Page() {
  return <ContactContent />;
}
