-- EJECUTAR SOLO DENTRO DEL PROYECTO DUBAIPARFUMS
-- El proyecto no se puede validar por correo: revisar nombre/URL en Supabase antes.
select id,store_code from public.store_identity;
select 'productos' as entidad, count(*) as total from public.products
union all select 'pedidos', count(*) from public.orders
union all select 'administradores', count(*) from public.admin_users;
select c.relname as tabla, c.relrowsecurity as rls_habilitado
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('store_identity','admin_users','products','orders')
order by c.relname;
select tablename,policyname,roles,cmd from pg_policies
where schemaname='public' and tablename in ('store_identity','admin_users','products','orders')
order by tablename,policyname;
select id,public as publico from storage.buckets where id='product-images';
