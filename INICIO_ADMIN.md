# Acceso al panel DubaiParfums

**Proyecto Supabase:** ecwmowpuzghadkdmxget  
**Panel:** `admin.html`  
**Estado verificado:** 60 productos inactivos, 0 usuarios Auth, 0 administradores, 0 pedidos.

1. Publica todo el contenido de esta carpeta en GitHub Pages o Hostinger, manteniendo `index.html` y `admin.html` juntos. Nunca publiques la carpeta `database` ni documentación con información interna si no es necesaria.
2. Abre `index.html`, presiona el icono de cuenta, elige **Crear cuenta** y regístrate con un correo que controles. Confírmalo en tu correo si Supabase te lo solicita. Puedes usar `juanj.gonzaleza@uniagustiniana.edu.co`.
3. En [Supabase → Authentication → Users](https://supabase.com/dashboard/project/ecwmowpuzghadkdmxget/auth/users) comprueba que aparece el usuario confirmado.
4. En [SQL Editor](https://supabase.com/dashboard/project/ecwmowpuzghadkdmxget/sql/new) ejecuta este SQL, **cambiando el correo si usaste otro**:

```sql
insert into public.admin_users(user_id)
select id from auth.users
where lower(email)=lower('juanj.gonzaleza@uniagustiniana.edu.co')
on conflict (user_id) do nothing;
```

5. Abre `admin.html` e inicia sesión con esa misma cuenta. Ya puedes editar el catálogo, fotos, precios, mayoristas y estados de pedidos. Solo un administrador autorizado podrá modificar información.
6. Los 60 perfumes de referencia están ocultos y sin stock. Edita y confirma la información, sube imágenes reales, añade stock y activa el producto para que aparezca públicamente. La tienda y el panel consultan `public.products`.

**IMPORTANTE:** el botón «Solicitar pedido» guarda una solicitud; NO realiza un cobro ni confirma pago. Una pasarela como Wompi necesita integración segura y webhooks antes de aceptar pagos reales.

**Seguridad:** no incluyas una clave service_role/secret en la web. Se usa únicamente la clave publicable y RLS. La contraseña del panel es la del usuario Supabase Auth, que se configura al registrarse.
