// 2026 함께하는 장날 초대장: 참석 응답 접수 (upsert)
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ATTENDANCE = ["참석", "불참"];
const CATEGORY = ["조합원", "후원회원", "외빈", "기타"];
const ACCOMMODATIONS = ["문자통역", "수어통역", "휠체어 접근", "점자·큰글자 자료", "기타"];

function bad(msg: string, status = 400): Response {
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return bad("POST only", 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return bad("잘못된 요청 형식입니다.");
  }

  // 허니팟: 봇이 채우는 숨김 필드
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return new Response(JSON.stringify({ ok: true, updated: false }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const name = String(body.name ?? "").trim();
  const phone = String(body.phone ?? "").replace(/\D/g, "");
  const attendance = String(body.attendance ?? "");
  const category = String(body.category ?? "");
  const companions = Number(body.companions ?? 0);
  const accommodationsRaw = Array.isArray(body.accommodations) ? body.accommodations : [];
  const accommodation_note = String(body.accommodation_note ?? "").trim().slice(0, 300) || null;
  const note = String(body.note ?? "").trim().slice(0, 500) || null;
  const privacy_agreed = body.privacy_agreed === true;

  if (!name || name.length > 40) return bad("이름을 확인해 주세요.");
  if (!/^[0-9]{8,12}$/.test(phone)) return bad("연락처를 확인해 주세요. 숫자만 8~12자리여야 합니다.");
  if (!ATTENDANCE.includes(attendance)) return bad("참석 여부를 선택해 주세요.");
  if (!CATEGORY.includes(category)) return bad("구분을 선택해 주세요.");
  if (!Number.isInteger(companions) || companions < 0 || companions > 5) {
    return bad("동반 인원을 확인해 주세요.");
  }
  if (!privacy_agreed) return bad("개인정보 수집·이용 동의가 필요합니다.");

  const accommodations = accommodationsRaw
    .map((a) => String(a))
    .filter((a) => ACCOMMODATIONS.includes(a));

  // 불참이면 참석 전용 필드는 비운다
  const isAttending = attendance === "참석";
  const row = {
    name,
    phone,
    attendance,
    category,
    companions: isAttending ? companions : 0,
    accommodations: isAttending ? accommodations : [],
    accommodation_note: isAttending ? accommodation_note : null,
    note,
    privacy_agreed,
  };

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: existing, error: selErr } = await supabase
    .from("rsvp")
    .select("id")
    .eq("name", name)
    .eq("phone", phone)
    .maybeSingle();
  if (selErr) return bad("잠시 후 다시 시도해 주세요.", 500);

  const { error } = await supabase
    .from("rsvp")
    .upsert(row, { onConflict: "name,phone" });
  if (error) return bad("저장에 실패했습니다. 잠시 후 다시 시도해 주세요.", 500);

  return new Response(JSON.stringify({ ok: true, updated: existing !== null }), {
    headers: { ...CORS, "Content-Type": "application/json" },
  });
});
