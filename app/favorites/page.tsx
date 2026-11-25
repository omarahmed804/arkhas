import type { Metadata } from "next";
import { FavoritesView } from "@/components/FavoritesView";

export const metadata: Metadata = { title: "المفضلة", robots: { index: false } };

export default function Page() {
  return <FavoritesView />;
}
