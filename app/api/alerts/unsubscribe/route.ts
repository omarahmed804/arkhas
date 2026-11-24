/** GET /api/alerts/unsubscribe?id=… — the link at the bottom of every alert email. */
import { alertsConfigured, deleteAlert } from "@/lib/alerts-db";

const page = (msg: string) =>
  new Response(
    `<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>أرخص</title><body style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:90vh;text-align:center"><div><h2>${msg}</h2><p><a href="/">ارجع لموقع أرخص</a></p></div></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!alertsConfigured() || !/^[0-9a-f-]{36}$/i.test(id)) return page("الرابط ده مش صحيح.");
  try {
    await deleteAlert(id);
  } catch {
    return page("حصلت مشكلة، جرب تاني بعد شوية.");
  }
  return page("تم إلغاء التنبيه ✅ — مش هنبعتلك عن المنتج ده تاني.");
}
