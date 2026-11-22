import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "تسجيل دخول الأدمن", robots: { index: false, follow: false } };

export default function AdminLoginPage() {
  return (
    <div className="mx-auto grid min-h-[70vh] max-w-sm place-items-center px-4 py-12">
      <LoginForm />
    </div>
  );
}
