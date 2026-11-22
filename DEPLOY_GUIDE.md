# دليل نشر موقع أرخص خطوة بخطوة (من غير أوامر Terminal)

> هتحتاج **كمبيوتر أو لابتوب** (رفع الفولدرات على GitHub مش بيشتغل كويس من الموبايل).
> الوقت المتوقع: حوالي 15 دقيقة. كل الخدمات دي **مجانية**.

---

## الجزء 1: ارفع المشروع على GitHub

1. **فك ضغط الملف** `arkhas.zip` على جهازك. هيطلعلك فولدر اسمه `arkhas`.
2. ادخل على **https://github.com/signup** واعمل حساب (لو معندكش).
3. ادخل على **https://github.com/new** واعمل Repository جديد:
   - **Repository name:** `arkhas`
   - اختار **Private** (عشان محدش يشوف الكود) أو Public براحتك.
   - **متعلّمش** على "Add a README file".
   - دوس **Create repository**.
4. في الصفحة اللي هتظهر، دوس على اللينك المكتوب **"uploading an existing file"**.
5. افتح فولدر `arkhas` على جهازك، **حدد كل اللي جواه** (Ctrl + A على ويندوز / Cmd + A على ماك) واسحبهم وارميهم في صفحة GitHub.
   - ⚠️ ارفع **المحتويات اللي جوه الفولدر** (زي `app` و `components` و `package.json`)، **مش** ملف الـ zip نفسه ومش الفولدر كله جوه فولدر تاني.
   - ✅ اتأكد إن ملف `package.json` ظاهر في القائمة.
   - لو فيه ملفات بتبدأ بنقطة زي `.gitignore` مش ظاهرة: على ماك دوس Cmd + Shift + . عشان تظهر. (مش ضرورية، الموقع هيشتغل من غيرها.)
6. استنى لحد ما الرفع يخلص، وبعدين دوس **Commit changes** تحت.

---

## الجزء 2: انشر الموقع على Vercel

1. ادخل على **https://vercel.com/signup** واختار **Continue with GitHub**.
2. دوس **Add New… ← Project**.
3. هتلاقي الـ Repository `arkhas` — دوس **Import** جنبه.
   (لو مش ظاهر: دوس "Adjust GitHub App Permissions" واسمح لـ Vercel يشوفه.)
4. **قبل ما تدوس Deploy** افتح قسم **Environment Variables** وضيف:
   - **Key:** `ADMIN_PASSWORD`
   - **Value:** كلمة سر قوية من اختيارك (مثلاً 16 حرف ورقم).
   - ⚠️ **مهم جدًا:** لو منسيتش الخطوة دي، كلمة سر لوحة التحكم هتفضل `arkhas2026` وأي حد يعرفها يقدر يدخل.
5. دوس **Deploy** واستنى دقيقة. هيديك رابط زي `arkhas.vercel.app` 🎉
6. جرب: افتح `رابط-موقعك/admin` — المفروض تطلعلك صفحة تسجيل الدخول.

**لو نسيت تضيف كلمة السر:** Project ← Settings ← Environment Variables ← ضيفها، وبعدين Deployments ← آخر Deployment ← النقط التلاتة ← **Redeploy**.

**دومين خاص (اختياري):** Project ← Settings ← Domains ← اكتب الدومين اللي اشتريته واتبع التعليمات.

---

## الجزء 3: إزاي تحدّث الأسعار والمنتجات

دلوقتي لوحة التحكم بتحفظ التعديلات **في المتصفح بتاعك بس**. عشان الزوار يشوفوها:

1. ادخل `/admin` وعدّل اللي انت عايزه.
2. روح تبويب **البيانات ← تصدير JSON**. هيتنزل ملف `catalog.json`.
3. على GitHub افتح الـ Repository ← فولدر `data` ← دوس **Add file ← Upload files**.
4. ارفع ملف `catalog.json` الجديد (هيستبدل القديم) ← **Commit changes**.
5. Vercel هينشر التحديث لوحده خلال دقيقة.

> ده مناسب في البداية. لما المنتجات تكتر، الجزء 4 (Supabase) بيخلي التعديلات تظهر للكل فورًا.

---

## الجزء 4: ربط Supabase بعدين (قاعدة بيانات حقيقية)

**الخطوات اللي تقدر تعملها بنفسك:**

1. اعمل حساب على **https://supabase.com** ← **New project** (اختار منطقة قريبة زي Frankfurt، واحفظ الـ Database password).
2. من القائمة الجانبية افتح **SQL Editor** ← **New query**.
3. افتح ملف `supabase/schema.sql` من المشروع، انسخ كل اللي فيه، الصقه، ودوس **Run**. كده الجداول اتعملت.
4. من **Project Settings ← API** انسخ:
   - `Project URL`
   - `anon public key`
5. في Vercel ← Settings ← Environment Variables ضيفهم كده:
   - `NEXT_PUBLIC_SUPABASE_URL` = الـ Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = الـ anon key

**الخطوة اللي محتاجة كود:**
الموقع لسه بيقرا من `catalog.json`. محتاج ملف جديد (`SupabaseRepository` في `lib/repository.ts`) يخلي الموقع يقرا ويكتب من Supabase، وتحويل تسجيل دخول الأدمن لـ Supabase Auth. ده تعديل في حدود ملف أو اتنين — ابعت الطلب وهيتعمل، وكل الصفحات هتفضل زي ما هي لأن الكود مبني على كده من الأول.

---

## مشاكل شائعة

| المشكلة | الحل |
|---|---|
| Vercel بيقول "No Next.js version detected" | ملف `package.json` مش في أول الـ Repository — اتأكد إنك رفعت محتويات الفولدر مش الفولدر نفسه. |
| صفحة `/admin` بتقول كلمة السر غلط | اتأكد من قيمة `ADMIN_PASSWORD` في Vercel، وإنك عملت Redeploy بعد ما غيرتها. |
| التعديلات اللي في الأدمن مش ظاهرة لصحابي | طبيعي — اتبع الجزء 3 (تصدير JSON) أو اربط Supabase. |
| الخط مش عربي/شكله غريب | الخط Cairo بيتحمل من Google Fonts — اتأكد إن النت شغال. |
