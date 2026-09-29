create table if not exists public.usuarios (
  id            uuid primary key references auth.users (id) on delete cascade,
  nombre        text not null check (char_length(nombre)   between 1 and 80),
  apellido      text not null check (char_length(apellido) between 1 and 80),
  correo        text not null,
  nombre_alumno text,
  curso         text,
  rol           text not null default 'apoderado' check (rol in ('apoderado', 'conductor')),
  created_at    timestamptz not null default now()
);

create unique index if not exists usuarios_correo_unico on public.usuarios (lower(correo));

alter table public.usuarios enable row level security;

drop policy if exists "usuarios_select_propio" on public.usuarios;
create policy "usuarios_select_propio" on public.usuarios
  for select to authenticated using (auth.uid() = id);

drop policy if exists "usuarios_insert_propio" on public.usuarios;
create policy "usuarios_insert_propio" on public.usuarios
  for insert to authenticated with check (auth.uid() = id);

create or replace function public.crear_perfil_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuarios (id, nombre, apellido, correo, nombre_alumno, curso, rol)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'nombre', ''),   'Sin nombre'),
    coalesce(nullif(new.raw_user_meta_data ->> 'apellido', ''), 'Sin apellido'),
    new.email,
    new.raw_user_meta_data ->> 'nombre_alumno',
    new.raw_user_meta_data ->> 'curso',
    case when new.raw_user_meta_data ->> 'rol' in ('apoderado', 'conductor')
         then new.raw_user_meta_data ->> 'rol' else 'apoderado' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.crear_perfil_usuario();

insert into storage.buckets (id, name, public)
values ('route-images', 'route-images', false)
on conflict (id) do nothing;
