-- 2026 함께하는 장날 초대장 RSVP 스키마 (MCP apply_migration으로 적용 완료된 사본)
create table public.rsvp (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 40),
  phone text not null check (phone ~ '^[0-9]{8,12}$'),
  attendance text not null check (attendance in ('참석','불참')),
  category text not null check (category in ('조합원','후원회원','외빈','기타')),
  companions int not null default 0 check (companions between 0 and 5),
  accommodations text[] not null default '{}',
  accommodation_note text check (accommodation_note is null or char_length(accommodation_note) <= 300),
  note text check (note is null or char_length(note) <= 500),
  privacy_agreed boolean not null check (privacy_agreed),
  unique (name, phone)
);
comment on table public.rsvp is '2026 함께하는 장날 참석 응답. 행사 종료 후 30일 이내 파기.';
alter table public.rsvp enable row level security;
create or replace function public.set_updated_at()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;
create trigger rsvp_updated_at before update on public.rsvp
for each row execute function public.set_updated_at();
