-- EJECUTAR SOLO EN EL PROYECTO NUEVO DE DUBAIPARFUMS.
-- Primero crear el usuario del panel en Authentication > Users.
-- El correo del panel puede ser el mismo que se usó para entrar a Supabase.
-- Esta consulta NO crea usuarios Auth ni contraseñas.
do $$
declare admin_id uuid;
begin
  select id into admin_id from auth.users
  where lower(email)=lower('juanj.gonzaleza@uniagustiniana.edu.co') limit 1;
  if admin_id is null then
    raise exception 'No existe este usuario en Supabase Auth; créalo primero en Authentication > Users';
  end if;
  insert into public.admin_users(user_id) values (admin_id)
    on conflict (user_id) do nothing;
end $$;
