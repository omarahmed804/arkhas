import type { Metadata } from "next";
import { AboutContent } from "@/components/InfoPages";

export const metadata: Metadata = { title: "من نحن" };

export default function Page() {
  return <AboutContent />;
}
