-- Auth provisioning, least-privilege API grants, and foundation query indexes.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Kundli user'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'profile role changes require administrative access';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_change on public.profiles;
create trigger profiles_prevent_role_change
  before update on public.profiles
  for each row execute function public.prevent_profile_role_change();

create index if not exists birth_profiles_owner_id_idx on public.birth_profiles(owner_id);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'birth_profiles'
      and column_name = 'client_id'
  ) then
    execute 'create index if not exists birth_profiles_client_id_idx on public.birth_profiles(client_id)';
  end if;
end
$$;

create index if not exists clients_pandit_id_idx on public.clients(pandit_id);
create index if not exists reports_owner_id_idx on public.reports(owner_id);
create index if not exists reports_related_birth_profile_id_idx on public.reports(related_birth_profile_id);
create index if not exists reports_related_client_id_idx on public.reports(related_client_id);
create index if not exists ai_usage_owner_period_idx on public.ai_usage(owner_id, billing_period_start, billing_period_end);
create index if not exists audit_logs_actor_id_idx on public.audit_logs(actor_id);

revoke all on table
  public.profiles,
  public.birth_profiles,
  public.pandits,
  public.clients,
  public.reports,
  public.ai_usage,
  public.audit_logs
from anon;

revoke all on table
  public.profiles,
  public.birth_profiles,
  public.pandits,
  public.clients,
  public.reports,
  public.ai_usage,
  public.audit_logs
from authenticated, public;

grant select, update on table public.profiles to authenticated;
grant select, insert, update on table public.birth_profiles to authenticated;
grant select on table public.pandits to authenticated;
grant select, insert, update, delete on table public.clients to authenticated;
grant select on table public.reports to authenticated;
grant select on table public.ai_usage to authenticated;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.is_admin() from public, anon, authenticated;
revoke all on function public.prevent_profile_role_change() from public, anon, authenticated;
