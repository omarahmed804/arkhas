"use client";

/** 30-day price trend + "real deal or fake discount?" verdict. */
import { CheckCircle2, Info, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatEGP, formatNumber } from "@/lib/format";
import { historyStats } from "@/lib/pricing";
import type { Product } from "@/lib/types";

const dayFmt = new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "short" });

const VERDICTS = {
  great: { icon: CheckCircle2, cls: "bg-deal-50 text-deal-700 dark:bg-deal-500/10 dark:text-deal-500", title: "أقل سعر في آخر 30 يوم — صفقة حقيقية" },
  good: { icon: TrendingDown, cls: "bg-deal-50 text-deal-700 dark:bg-deal-500/10 dark:text-deal-500", title: "السعر أقل من المتوسط — وقت كويس للشراء" },
  normal: { icon: Info, cls: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", title: "السعر عادي — مفيش خصم حقيقي حاليًا" },
  high: { icon: TrendingUp, cls: "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400", title: "السعر أعلى من المعتاد — ممكن تستنى" },
} as const;

export function PriceHistoryChart({ product }: { product: Product }) {
  const stats = historyStats(product);
  // Recharts measures the DOM; render it only on the client to avoid SSR size warnings.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!stats) return null;
  const v = VERDICTS[stats.verdict];
  const data = product.priceHistory.map((p) => ({ ...p, label: dayFmt.format(new Date(p.date)) }));
  const pad = Math.max(50, (stats.max - stats.min) * 0.25);

  return (
    <section className="card p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black">تاريخ السعر (آخر 30 يوم)</h2>
        <span className={`chip py-1.5 ${v.cls}`}>
          <v.icon className="size-4" /> {v.title}
        </span>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2 text-center">
        {[
          ["أقل سعر", stats.min, "text-deal-600 dark:text-deal-500"],
          ["المتوسط", stats.avg, ""],
          ["أعلى سعر", stats.max, "text-red-600"],
        ].map(([label, value, cls]) => (
          <div key={label as string} className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60">
            <p className="text-[11px] text-slate-500">{label}</p>
            <p className={`text-sm font-black sm:text-base ${cls}`}>{formatEGP(value as number)}</p>
          </div>
        ))}
      </div>

      {/* Charts read left→right (oldest → today) even in RTL pages */}
      <div dir="ltr" className="h-60 w-full sm:h-72">
        {mounted && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-800" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
              <YAxis
                domain={[Math.floor(stats.min - pad), Math.ceil(stats.max + pad)]}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                tickFormatter={(n: number) => formatNumber(n)}
                tickLine={false}
                axisLine={false}
                width={56}
              />
              <ReferenceLine y={stats.avg} stroke="#94a3b8" strokeDasharray="4 4" />
              <Tooltip
                cursor={{ stroke: "#2563eb", strokeOpacity: 0.3 }}
                contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", direction: "rtl", fontFamily: "Cairo, sans-serif" }}
                labelStyle={{ fontWeight: 700 }}
                formatter={(value) => [formatEGP(Number(value)), "أقل سعر"]}
              />
              <Line type="monotone" dataKey="price" stroke="#2563eb" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-500">الخط المتقطع = متوسط السعر. كل نقطة = أقل سعر متوفر في كل المتاجر في اليوم ده.</p>
    </section>
  );
}
