# KimyoLab: Netlify'ga joylash

Sayt (public/index.html) + server funksiyasi (netlify/functions/api.mjs). Maʼlumotlar Netlify Blobs'da saqlanadi (alohida baza kerak emas).

## Loginlar
- **Ustoz:** login `ustoz`, parol Netlify'dagi `TEACHER_PASSWORD` o'zgaruvchisi (o'rnatmasangiz `ustoz12345`, albatta almashtiring).
- **O'quvchilar:** ustoz saytga kirib, «Oʻquvchilar» bo'limida ism, login va parol bilan hisob yaratadi va o'quvchiga beradi.

## Joylash (GitHub orqali, eng oson)
1. Bu papkani GitHub'ga yangi repo qilib yuklang.
2. Netlify: Add new site → Import an existing project → repo'ni tanlang. Build command bo'sh, publish `public` (netlify.toml'da bor).
3. Site configuration → Environment variables:
   - `TEACHER_PASSWORD` = o'zingizning kuchli parolingiz
   - `AUTH_SECRET` = uzun tasodifiy matn (masalan 40 ta belgi)
4. Deploy'ni qayta ishga tushiring.

## Joylash (CLI)
```
npm i -g netlify-cli
npm install
netlify login
netlify init
netlify env:set TEACHER_PASSWORD "parolingiz"
netlify env:set AUTH_SECRET "uzun-tasodifiy-matn"
netlify deploy --prod
```
Sinab ko'rish: `netlify dev`.

## Eslatma
- Chat har 4 soniyada yangilanadi (real vaqtga yaqin).
- Oddiy drag-and-drop (papkani tashlash) funksiya va paketlar uchun ishonchli emas, GitHub yoki CLI ishlating.
- Hajmi katta sinf (100+ o'quvchi) uchun keyinchalik haqiqiy bazaga o'tish kerak bo'ladi.
