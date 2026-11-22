/**
 * Admin "حدّث الأسعار الآن": starts the GitHub Actions price tracker immediately.
 * Needs two Vercel environment variables:
 *   GITHUB_REPO  = "your-username/arkhas"
 *   GITHUB_TOKEN = fine-grained token with "Actions: Read and write" on that repo
 */
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE, isValidSession } from "@/lib/admin-auth";

export async function POST() {
  if (!(await isValidSession((await cookies()).get(ADMIN_COOKIE)?.value))) {
    return NextResponse.json({ ok: false, message: "لازم تسجل دخول الأول." }, { status: 401 });
  }
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;
  if (!repo || !token) {
    return NextResponse.json({
      ok: false,
      message: "زرار التحديث الفوري محتاج GITHUB_REPO و GITHUB_TOKEN في إعدادات Vercel (الخطوات في DEPLOY_GUIDE). التحديث التلقائي كل 6 ساعات شغال من غيرهم.",
    });
  }
  const res = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/update-prices.yml/dispatches`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
    body: JSON.stringify({ ref: process.env.GITHUB_BRANCH || "main" }),
  });
  if (res.status === 204) {
    return NextResponse.json({ ok: true, message: "بدأ تحديث الأسعار ✓ — هيخلص ويظهر على الموقع خلال 5–10 دقايق." });
  }
  return NextResponse.json({ ok: false, message: `GitHub رفض الطلب (${res.status}). اتأكد من التوكن واسم الريبو.` });
}
