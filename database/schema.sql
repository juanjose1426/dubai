-- DUBAIPARFUMS · BASE INDEPENDIENTE · SUPABASE POSTGRESQL
-- Ejecutar UNA SOLA VEZ en el proyecto Supabase NUEVO, nunca en DELTA o KingSeduccion.
-- Los precios oficiales viven únicamente en public.products.
-- Las compras se calculan en un trigger del servidor; el navegador no fija totales.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- Identidad de la tienda: impide que el frontend use por error otro proyecto Supabase.
-- Se valida antes de leer catálogo, autenticar o realizar cualquier operación.
create table if not exists public.store_identity (
 id smallint primary key default 1 check (id=1),
 store_code text not null check (store_code='DUBAIPARFUMS'),
 created_at timestamptz not null default now()
);
insert into public.store_identity (id,store_code) values (1,'DUBAIPARFUMS')
on conflict (id) do nothing;
alter table public.store_identity enable row level security;
revoke all on public.store_identity from public, anon, authenticated;
grant select on public.store_identity to anon, authenticated;
create policy "dubai_identity_read" on public.store_identity for select to anon, authenticated
 using (id=1 and store_code='DUBAIPARFUMS');

create table if not exists public.admin_users (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
grant select on public.admin_users to authenticated;
create policy "admin_users_read_self" on public.admin_users for select to authenticated
 using (user_id=(select auth.uid()));

create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
 select exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()));
$$;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

create table if not exists public.products (
 id uuid primary key default gen_random_uuid(),
 name text not null check (length(btrim(name)) between 2 and 140),
 brand text not null check (length(btrim(brand)) between 2 and 100),
 description text not null default '',
 family text not null default '',
 gender text not null default 'Unisex' check (gender in ('Hombre','Mujer','Unisex')),
 concentration text not null default 'Eau de Parfum',
 size_ml integer not null default 100 check (size_ml between 1 and 1000),
 notes text[] not null default '{}',
 price_retail numeric(13,0) not null check (price_retail > 0),
 price_wholesale numeric(13,0) not null default 0 check (price_wholesale >= 0 and price_wholesale <= price_retail),
 wholesale_min_qty integer not null default 6 check (wholesale_min_qty between 2 and 1000),
 stock integer not null default 0 check (stock between 0 and 1000000),
 image_url text not null default '',
 featured boolean not null default false,
 active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists idx_dubai_products_active on public.products(active,featured,name);
create index if not exists idx_dubai_products_brand on public.products(brand);
alter table public.products enable row level security;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
create policy "products_anon_read_active" on public.products for select to anon using (active);
create policy "products_auth_read_active_or_admin" on public.products for select to authenticated
 using (active or (select private.is_admin()));
create policy "products_admin_insert" on public.products for insert to authenticated
 with check ((select private.is_admin()));
create policy "products_admin_update" on public.products for update to authenticated
 using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "products_admin_delete" on public.products for delete to authenticated
 using ((select private.is_admin()));

create or replace function private.touch_product() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at:=now();return new;end;$$;
revoke all on function private.touch_product() from public, anon, authenticated;
create trigger dubai_touch_product before update on public.products
 for each row execute function private.touch_product();

create table if not exists public.orders (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id),
 customer_name text not null check (length(btrim(customer_name)) between 2 and 120),
 customer_email text not null,
 customer_phone text not null check (length(btrim(customer_phone)) between 7 and 30),
 shipping_address text not null check (length(btrim(shipping_address)) between 8 and 400),
 requested_items jsonb not null,
 items_snapshot jsonb not null default '[]'::jsonb,
 total numeric(13,0) not null default 0,
 status text not null default 'pendiente' check (status in ('pendiente','confirmado','enviado','entregado','cancelado')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists idx_dubai_orders_user on public.orders(user_id,created_at desc);
create index if not exists idx_dubai_orders_status on public.orders(status,created_at desc);
alter table public.orders enable row level security;
grant select, insert on public.orders to authenticated;
grant update(status) on public.orders to authenticated;
create policy "orders_read_self_or_admin" on public.orders for select to authenticated
 using (user_id=(select auth.uid()) or (select private.is_admin()));
create policy "orders_insert_self" on public.orders for insert to authenticated
 with check (user_id=(select auth.uid()) and status='pendiente');
create policy "orders_update_admin" on public.orders for update to authenticated
 using ((select private.is_admin())) with check ((select private.is_admin()));

-- Calcula el total desde la tabla products, no desde precios enviados por el cliente.
create or replace function private.verify_new_order() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
 item jsonb; p public.products%rowtype; pid uuid; qty integer;
 ids uuid[] := '{}'; snapshots jsonb := '[]'::jsonb;
 amount numeric(13,0) := 0; price numeric(13,0); who_email text;
begin
 if (select auth.uid()) is null then raise exception 'Debes iniciar sesión'; end if;
 if jsonb_typeof(new.requested_items) is distinct from 'array'
    or jsonb_array_length(new.requested_items) not between 1 and 30 then
   raise exception 'El pedido debe tener entre 1 y 30 perfumes diferentes';
 end if;
 new.user_id := (select auth.uid());
 select email into who_email from auth.users where id = new.user_id;
 new.customer_email := who_email;
 for item in select value from jsonb_array_elements(new.requested_items) loop
   pid := (item->>'id')::uuid;
   qty := (item->>'quantity')::integer;
   if pid is null or qty is null or qty not between 1 and 100 or pid=any(ids) then
     raise exception 'Artículo o cantidad inválida en el pedido';
   end if;
   ids := array_append(ids,pid);
   select * into p from public.products where id=pid and active=true;
   if not found then raise exception 'El perfume solicitado no está disponible'; end if;
   if p.stock < qty then raise exception 'Stock insuficiente para % (disponible: %)', p.name, p.stock; end if;
   price := case when p.price_wholesale > 0 and p.price_wholesale < p.price_retail
                 and qty >= p.wholesale_min_qty then p.price_wholesale else p.price_retail end;
   amount := amount + price*qty;
   snapshots := snapshots || jsonb_build_array(jsonb_build_object(
      'id',p.id,'name',p.name,'brand',p.brand,'quantity',qty,
      'unit_price',price,'line_total',price*qty));
 end loop;
 new.items_snapshot:=snapshots;
 new.total:=amount;
 new.status:='pendiente';
 new.created_at:=now();new.updated_at:=now();
 return new;
end;$$;
revoke all on function private.verify_new_order() from public, anon, authenticated;
create trigger dubai_verify_order before insert on public.orders
 for each row execute function private.verify_new_order();

-- El stock baja al CONFIRMAR el pedido; si se cancela desde confirmado se restituye.
create or replace function private.order_status_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare item jsonb; pid uuid; qty int; did uuid;
begin
 if new.status is distinct from old.status then
  if not (
    (old.status='pendiente' and new.status in ('confirmado','cancelado')) or
    (old.status='confirmado' and new.status in ('enviado','cancelado')) or
    (old.status='enviado' and new.status='entregado')
  ) then raise exception 'Transición de estado inválida: % → %', old.status,new.status;end if;
  if old.status='pendiente' and new.status='confirmado' then
    for item in select value from jsonb_array_elements(old.items_snapshot) loop
      pid:=(item->>'id')::uuid;qty:=(item->>'quantity')::int;
      update public.products set stock=stock-qty where id=pid and stock>=qty returning id into did;
      if not found then raise exception 'Stock insuficiente para confirmar pedido';end if;
    end loop;
  elsif old.status='confirmado' and new.status='cancelado' then
    for item in select value from jsonb_array_elements(old.items_snapshot) loop
      pid:=(item->>'id')::uuid;qty:=(item->>'quantity')::int;
      update public.products set stock=stock+qty where id=pid;
    end loop;
  end if;
 end if;
 new.id:=old.id;new.user_id:=old.user_id;new.customer_name:=old.customer_name;
 new.customer_email:=old.customer_email;new.customer_phone:=old.customer_phone;
 new.shipping_address:=old.shipping_address;new.requested_items:=old.requested_items;
 new.items_snapshot:=old.items_snapshot;new.total:=old.total;
 new.created_at:=old.created_at;new.updated_at:=now();
 return new;
end;$$;
revoke all on function private.order_status_guard() from public, anon, authenticated;
create trigger dubai_order_status before update on public.orders
 for each row execute function private.order_status_guard();

-- Bucket público: solo administradores pueden subir, editar o eliminar imágenes.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('product-images','product-images',true,4194304,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy "dubai_images_public_read" on storage.objects for select to anon,authenticated
 using (bucket_id='product-images');
create policy "dubai_images_admin_insert" on storage.objects for insert to authenticated
 with check (bucket_id='product-images' and (select private.is_admin()));
create policy "dubai_images_admin_update" on storage.objects for update to authenticated
 using (bucket_id='product-images' and (select private.is_admin()))
 with check (bucket_id='product-images' and (select private.is_admin()));
create policy "dubai_images_admin_delete" on storage.objects for delete to authenticated
 using (bucket_id='product-images' and (select private.is_admin()));

-- PASO ADMIN (ejecutar DESPUÉS de registrar y confirmar la cuenta del administrador):
-- insert into public.admin_users(user_id)
-- select id from auth.users where lower(email)=lower('TU_EMAIL_ADMIN@EJEMPLO.COM')
-- on conflict (user_id) do nothing;

-- Opcional para actualización inmediata en el catálogo (además de sincronización periódica).
-- Si la tabla ya está en la publicación, no repetir el alta.
do $$ begin
 if exists (select 1 from pg_publication where pubname='supabase_realtime')
    and not exists (select 1 from pg_publication_tables
         where pubname='supabase_realtime' and schemaname='public' and tablename='products')
 then alter publication supabase_realtime add table public.products; end if;
end $$;
