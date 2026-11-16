import { getStore } from "@netlify/blobs";
import { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";

const TP = process.env.TEACHER_PASSWORD || "ustoz12345"; // Netlify'da o'zgartiring!
const SEC = process.env.AUTH_SECRET || "kl:" + TP;
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const mac = d => createHmac("sha256", SEC).update(d).digest("base64url");
const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };
const sign = p => { const d = Buffer.from(JSON.stringify(p)).toString("base64url"); return d + "." + mac(d); };
const verify = t => { try { const [d, s] = t.split("."); if (!same(s, mac(d))) return null; const p = JSON.parse(Buffer.from(d, "base64url")); return p.exp > Date.now() ? p : null; } catch { return null; } };
const hp = (pw, salt) => scryptSync(String(pw), salt, 32).toString("hex");
const clean = s => String(s || "").trim();
const LOGIN = /^[a-z0-9_.-]{1,20}$/;
const WEEK = 6048e5;

export default async (req) => {
  const B = getStore("kimyolab");
  const parts = new URL(req.url).pathname.replace(/^\/api\//, "").split("/").filter(Boolean);
  const [r, id] = parts, m = req.method;
  let body = {};
  if (m === "POST") { try { body = await req.json(); } catch {} }

  if (r === "login" && m === "POST") {
    const lg = clean(body.login).toLowerCase(), pw = String(body.password || "");
    await new Promise(ok => setTimeout(ok, 400));
    const bad = () => J({ error: "Login yoki parol xato" }, 401);
    if (lg === "ustoz") {
      if (!same(pw, TP)) return bad();
      return J({ token: sign({ u: "ustoz", n: "Ustoz", r: "teacher", exp: Date.now() + WEEK }), login: "ustoz", name: "Ustoz", role: "teacher" });
    }
    if (!LOGIN.test(lg)) return bad();
    const s = await B.get("s/" + lg, { type: "json" });
    if (!s || !same(hp(pw, s.salt), s.hash)) return bad();
    return J({ token: sign({ u: lg, n: s.name, r: "student", exp: Date.now() + WEEK }), login: lg, name: s.name, role: "student" });
  }

  const a = verify((req.headers.get("authorization") || "").slice(7));
  if (!a) return J({ error: "Kirish kerak" }, 401);
  const T = a.r === "teacher";
  const forbid = () => J({ error: "Bu amal faqat ustoz uchun" }, 403);

  if (r === "data" && m === "GET") {
    const questions = (await B.get("questions", { type: "json" })) || [];
    const { blobs } = await B.list({ prefix: "s/" });
    const all = await Promise.all(blobs.map(b => B.get(b.key, { type: "json" })));
    const students = all.filter(Boolean).map(s => {
      const h = s.h || [];
      return { login: s.login, name: s.name, count: h.length, avg: h.length ? Math.round(h.reduce((x, y) => x + y.s / y.n, 0) / h.length * 100) : 0 };
    });
    return J({ questions, students });
  }

  if (r === "questions") {
    if (!T) return forbid();
    let qs = (await B.get("questions", { type: "json" })) || [];
    if (m === "POST") {
      const o = Array.isArray(body.o) ? body.o.map(x => clean(x).slice(0, 200)) : [];
      const q = clean(body.q).slice(0, 500);
      if (!q || o.length !== 4 || o.some(x => !x) || ![0, 1, 2, 3].includes(body.a)) return J({ error: "Savol to'liq emas" }, 400);
      const img = typeof body.img === "string" && body.img.startsWith("data:image/") && body.img.length < 250000 ? body.img : "";
      qs.push({ id: randomUUID().slice(0, 8), topic: clean(body.topic).slice(0, 40) || "Umumiy", q, o, a: body.a, e: clean(body.e).slice(0, 500), img, c: Date.now() });
    } else if (m === "DELETE") qs = qs.filter(x => x.id !== id);
    else return J({ error: "Noto'g'ri so'rov" }, 405);
    await B.setJSON("questions", qs);
    return J({ ok: true });
  }

  if (r === "students") {
    if (!T) return forbid();
    if (m === "POST") {
      const lg = clean(body.login).toLowerCase(), name = clean(body.name).slice(0, 40), pw = String(body.password || "");
      if (!LOGIN.test(lg) || lg === "ustoz") return J({ error: "Login: 1-20 ta kichik harf, raqam, _ . -" }, 400);
      if (!name || pw.length < 4) return J({ error: "Ism va kamida 4 belgili parol kerak" }, 400);
      const old = await B.get("s/" + lg, { type: "json" });
      const salt = randomBytes(16).toString("hex");
      await B.setJSON("s/" + lg, { login: lg, name, salt, hash: hp(pw, salt), h: old ? old.h || [] : [] });
      return J({ ok: true });
    }
    if (m === "DELETE" && LOGIN.test(id || "")) { await B.delete("s/" + id); return J({ ok: true }); }
    return J({ error: "Noto'g'ri so'rov" }, 405);
  }

  if (r === "result" && m === "POST") {
    if (T) return J({ ok: true });
    const s = await B.get("s/" + a.u, { type: "json" });
    if (!s) return J({ error: "Hisob topilmadi" }, 404);
    const n = Math.max(1, Math.min(100, +body.n | 0)), sc = Math.max(0, Math.min(n, +body.s | 0));
    s.h = [...(s.h || []), { t: clean(body.topic).slice(0, 40), s: sc, n, d: Date.now() }].slice(-50);
    await B.setJSON("s/" + a.u, s);
    return J({ ok: true });
  }

  if (r === "chat") {
    let ms = (await B.get("chat", { type: "json" })) || [];
    if (m === "GET") return J({ messages: ms });
    if (m === "POST") {
      const x = clean(body.text).slice(0, 500);
      if (!x) return J({ error: "Bo'sh xabar" }, 400);
      ms = [...ms, { id: randomUUID().slice(0, 8), u: a.u, n: a.n, r: a.r, x, t: Date.now() }].slice(-100);
    } else if (m === "DELETE") { if (!T) return forbid(); ms = ms.filter(x => x.id !== id); }
    else return J({ error: "Noto'g'ri so'rov" }, 405);
    await B.setJSON("chat", ms);
    return J({ ok: true });
  }
  return J({ error: "Topilmadi" }, 404);
};

export const config = { path: "/api/*" };
