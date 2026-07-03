-- 어드바이저 경고 해소: 트리거 함수는 invoker 권한으로, RPC 실행 권한 회수
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

revoke execute on function public.set_updated_at() from public, anon, authenticated;
