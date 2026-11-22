"use client";

import { Eye, EyeOff, Lock, LogIn } from "lucide-react";
import { useActionState, useState } from "react";
import { login } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  const [show, setShow] = useState(false);

  return (
    <form action={action} className="card w-full p-6">
      <span className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30">
        <Lock className="size-6" />
      </span>
      <h1 className="text-center text-xl font-black">لوحة التحكم</h1>
      <p className="mb-6 mt-1 text-center text-sm text-slate-500">ادخل كلمة السر عشان تكمل</p>

      <label htmlFor="password" className="label">كلمة السر</label>
      <div className="relative">
        <input
          id="password"
          name="password"
          type={show ? "text" : "password"}
          required
          autoFocus
          autoComplete="current-password"
          dir="ltr"
          className="input pe-10 text-start"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "إخفاء كلمة السر" : "إظهار كلمة السر"}
          className="absolute end-2 top-1/2 -translate-y-1/2 p-1 text-slate-400"
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>

      {state?.error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 p-2 text-center text-sm font-bold text-red-600 dark:bg-red-500/10">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary mt-5 w-full py-3">
        <LogIn className="size-4" /> {pending ? "جاري الدخول…" : "دخول"}
      </button>
    </form>
  );
}
