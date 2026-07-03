// 2026 함께하는 장날 초대장: 관리자 현황 조회 (x-admin-token 필요)
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ ok: false, error: "GET only" }), {
      status: 405,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // 토큰은 admin_config 테이블(RLS 전면 차단)에 보관. env secret은 대시보드 권한 문제로 미사용.
  const token = req.headers.get("x-admin-token") ?? "";
  const { data: cfg } = await supabase
    .from("admin_config")
    .select("value")
    .eq("key", "ADMIN_TOKEN")
    .maybeSingle();
  const expected = cfg?.value ?? "";
  if (!expected || !timingSafeEqual(token, expected)) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 401,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const { data, error } = await supabase
    .from("rsvp")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    return new Response(JSON.stringify({ ok: false, error: "query failed" }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const rows = data ?? [];
  const attending = rows.filter((r) => r.attendance === "참석");
  const stats = {
    total: rows.length,
    attending: attending.length,
    declined: rows.length - attending.length,
    attendingWithCompanions: attending.reduce(
      (sum, r) => sum + 1 + (r.companions ?? 0),
      0,
    ),
    byCategory: {} as Record<string, number>,
    byAccommodation: {} as Record<string, number>,
  };
  for (const r of attending) {
    stats.byCategory[r.category] = (stats.byCategory[r.category] ?? 0) + 1;
    for (const a of r.accommodations ?? []) {
      stats.byAccommodation[a] = (stats.byAccommodation[a] ?? 0) + 1;
    }
  }

  return new Response(JSON.stringify({ ok: true, stats, rows }), {
    headers: { ...CORS, "Content-Type": "application/json" },
  });
});
