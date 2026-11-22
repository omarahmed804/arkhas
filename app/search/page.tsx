import type { Metadata } from "next";
import { Suspense } from "react";
import { ListingView } from "@/components/ListingView";

export const metadata: Metadata = { title: "البحث ومقارنة الأسعار" };

export default function SearchPage() {
  return (
    <Suspense>
      <ListingView />
    </Suspense>
  );
}
