# DubaiParfums — tienda conectada a Supabase (18 noviembre 2026)

La tienda usa **exclusivamente** el proyecto `ecwmowpuzghadkdmxget` de la organización `dubaiparfums`, no DELTA ni King Seducción.

## Estado real
- Migración SQL aplicada, identidad de tienda comprobada.
- 60 perfumes de referencia importados, todos **inactivos, stock 0 y sin precio mayorista** (no hay inventario confirmado).
- Tablas `products`, `orders`, `admin_users`, `store_identity`, bucket `product-images`; RLS habilitado.
- 0 usuarios y 0 administradores al momento de empaquetar: **falta registrar y autorizar tu usuario** (ver `INICIO_ADMIN.md`).
- Pasarela de pagos NO instalada. El checkout registra pedidos pendientes, no cobros.
- Frontend integrado con clave publicable en `assets/supabase-config.js`.

## Publicación
Copia `index.html`, `admin.html`, `diagnostico.html` y `assets/` al hosting. No necesitas ejecutar `database/schema.sql` otra vez: el esquema y las 60 referencias ya se instalaron en el proyecto remoto.

En el panel, la acción «Guardar y comprobar» escribe en Supabase y consulta inmediatamente el registro para verificar los precios. Los productos activos son visibles en el catálogo al actualizar o por Realtime.

## Primer inicio de sesión administrativo
Sigue `INICIO_ADMIN.md` para crear un usuario de Supabase Auth, confirmar el correo y asignarle el permiso `admin_users`. No compartas claves ni contraseñas.
