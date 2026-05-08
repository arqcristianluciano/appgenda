-- ============================================================
-- MIGRACIÓN 004: handle_new_user resiliente
-- El trigger fallaba con "Database error saving new user" cuando un
-- usuario nuevo intentaba registrarse: si el insert a profiles fallaba
-- (por race con email único, permisos, etc.) el signup completo se
-- abortaba. Esta versión:
-- - Captura excepciones del insert/update.
-- - Hace conflict tanto por id como por email.
-- - Garantiza grants para que la función pueda ejecutarse desde el
--   contexto del trigger en auth.users.
-- ============================================================

create or replace function handle_new_user()
returns trigger as $$
begin
  begin
    insert into public.profiles (id, email, name, avatar_url)
    values (
      new.id,
      new.email,
      coalesce(
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'name',
        split_part(new.email, '@', 1)
      ),
      new.raw_user_meta_data->>'avatar_url'
    )
    on conflict (id) do update set
      name = coalesce(excluded.name, profiles.name),
      avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url);
  exception when unique_violation then
    update public.profiles
       set id = new.id
     where email = new.email;
  when others then
    raise warning 'handle_new_user: % %', sqlstate, sqlerrm;
  end;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

grant usage on schema public to supabase_auth_admin;
grant insert, update, select on public.profiles to supabase_auth_admin;
grant execute on function public.handle_new_user() to supabase_auth_admin;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
