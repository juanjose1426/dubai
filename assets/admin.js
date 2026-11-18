import {db,configured,verifyStoreIdentity,money,escapeHTML as esc,safeImage,notice,uid} from './shared.js';
const $=s=>document.querySelector(s);
const S={user:null,products:[],orders:[],tab:'overview',edit:null};
const fields={name:'#p-name',brand:'#p-brand',family:'#p-family',gender:'#p-gender',concentration:'#p-concentration',size_ml:'#p-size',stock:'#p-stock',price_retail:'#p-retail',price_wholesale:'#p-wholesale',wholesale_min_qty:'#p-min',description:'#p-description',notes:'#p-notes',active:'#p-active',featured:'#p-featured'};
function errorText(err){return err?.message||String(err)}
function tab(name){S.tab=name;document.querySelectorAll('.admin-tab').forEach(x=>x.classList.toggle('hidden',x.id!==`tab-${name}`));document.querySelectorAll('.admin-nav').forEach(x=>x.classList.toggle('active',x.dataset.tab===name));$('#admin-page-title').textContent={overview:'Vista general',products:'Perfumes y precios',orders:'Gestión de pedidos'}[name]}
async function authorized(user){let {data,error}=await db.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();if(error)throw error;return Boolean(data)}
async function checkSession(){if(!configured){$('#admin-login-info').textContent='Vista previa: primero debes crear y conectar la nueva base Supabase de DubaiParfums.';$('#admin-submit').disabled=true;return}const identity=await verifyStoreIdentity();if(!identity.ok){$('#admin-login-info').textContent=identity.reason;$('#admin-submit').disabled=true;return}let {data:{user},error}=await db.auth.getUser();if(error||!user)return;try{if(await authorized(user))showApp(user);else{$('#admin-login-message').textContent='La cuenta está autenticada, pero no tiene permiso de administrador.'}}catch(e){$('#admin-login-message').textContent=errorText(e)}}
async function login(event){event.preventDefault();if(!db)return;const identity=await verifyStoreIdentity();if(!identity.ok){$('#admin-login-message').textContent=identity.reason;return}let b=$('#admin-submit');b.disabled=true;b.textContent='Verificando acceso...';let {data,error}=await db.auth.signInWithPassword({email:$('#admin-email').value.trim(),password:$('#admin-password').value});b.disabled=false;b.textContent='Entrar al panel ↗';if(error){$('#admin-login-message').textContent=errorText(error);return}try{if(!await authorized(data.user)){await db.auth.signOut();$('#admin-login-message').textContent='Esta cuenta no tiene acceso administrativo. Solicita que la agreguen a admin_users.';return}showApp(data.user)}catch(e){$('#admin-login-message').textContent=errorText(e)}}
async function showApp(user){S.user=user;$('#admin-auth').classList.add('hidden');$('#admin-app').classList.remove('hidden');$('#admin-email-label').textContent=user.email||'';await reload()}
async function reload(){await Promise.all([loadProducts(),loadOrders()]);$('#stat-products').textContent=S.products.length;$('#stat-active').textContent=S.products.filter(p=>p.active).length;$('#stat-stock').textContent=S.products.reduce((n,p)=>n+(Number(p.stock)||0),0).toLocaleString('es-CO');$('#stat-orders').textContent=S.orders.filter(o=>o.status==='pendiente').length}
async function loadProducts(){let {data,error}=await db.from('products').select('*').order('updated_at',{ascending:false});if(error){notice('Error cargando productos: '+errorText(error),'error');return}S.products=data||[];renderProducts()}
function renderProducts(){let search=$('#admin-search').value.toLowerCase();let rows=S.products.filter(p=>[p.name,p.brand,p.family].join(' ').toLowerCase().includes(search));$('#admin-product-count').textContent=`${rows.length} productos`;
 $('#admin-product-rows').innerHTML=rows.length?rows.map(p=>`<tr><td><div class="table-product"><img src="${esc(safeImage(p.image_url))}" alt="${esc(p.name)}"><div><strong>${esc(p.name)}</strong><small>${esc(p.brand||'')} · ${p.size_ml||100} ml</small></div></div></td><td><strong>${money(p.price_retail)}</strong><small>Mayor: ${money(p.price_wholesale)} · mín. ${p.wholesale_min_qty||6}</small></td><td><strong>${Number(p.stock)||0}</strong> unidades</td><td><span class="status-pill ${p.active?'':'off'}">${p.active?'Visible':'Oculto'}</span></td><td><button class="table-action" data-action="edit" data-id="${esc(p.id)}">Editar</button><button class="table-action" data-action="toggle" data-id="${esc(p.id)}">${p.active?'Ocultar':'Mostrar'}</button><button class="table-action" data-action="delete" data-id="${esc(p.id)}" title="Eliminar producto">Eliminar</button></td></tr>`).join(''):'<tr><td colspan="5" style="text-align:center;padding:40px">No hay perfumes. Haz clic en “Nuevo perfume” para empezar.</td></tr>'}
async function loadOrders(){let {data,error}=await db.from('orders').select('*').order('created_at',{ascending:false}).limit(250);if(error){notice('Error cargando pedidos: '+errorText(error),'error');return}S.orders=data||[];renderOrders()}
function statuses(old){const permitted={pendiente:['pendiente','confirmado','cancelado'],confirmado:['confirmado','enviado','cancelado'],enviado:['enviado','entregado'],entregado:['entregado'],cancelado:['cancelado']};return permitted[old]||[old]}
function renderOrders(){$('#admin-order-rows').innerHTML=S.orders.length?S.orders.map(o=>{let detail=(o.items_snapshot||[]).map(i=>`${esc(i.name||'Perfume')} × ${i.quantity}`).join(' · ');return `<tr><td><strong>#${esc(o.id.slice(0,8).toUpperCase())}</strong><small>${new Date(o.created_at).toLocaleString('es-CO')}</small></td><td><strong>${esc(o.customer_name)}</strong><small>${esc(o.customer_email)}</small><small>${esc(o.customer_phone)}</small><small>${esc(o.shipping_address)}</small></td><td><div class="admin-order-detail">${detail||'Sin artículos'}</div></td><td><strong>${money(o.total)}</strong></td><td><select class="order-status" data-id="${esc(o.id)}" aria-label="Cambiar estado">${statuses(o.status).map(s=>`<option ${s===o.status?'selected':''} value="${s}">${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join('')}</select></td></tr>`}).join(''):'<tr><td colspan="5" style="text-align:center;padding:40px">Aún no se han registrado pedidos.</td></tr>'}
function editor(p=null){S.edit=p?.id||null;$('#product-form').reset();$('#p-id').value=p?.id||'';$('#editor-title').textContent=p?'Editar perfume':'Nuevo perfume';$('#p-photo').value='';for(const [key,selector] of Object.entries(fields)){const input=$(selector);if(input.type==='checkbox')input.checked=p?Boolean(p[key]):key==='active';else if(key==='notes')input.value=(p?.notes||[]).join(', ');else input.value=p?.[key]??({size_ml:100,stock:0,price_retail:'',price_wholesale:0,wholesale_min_qty:6,gender:'Unisex',concentration:'Eau de Parfum'}[key]??'')}
 $('#p-image-url').value=p?.image_url||'';$('#p-preview').src=safeImage(p?.image_url);$('#editor-message').textContent='';$('#editor-overlay').classList.remove('hidden');document.body.classList.add('no-scroll')}
function closeEditor(){$('#editor-overlay').classList.add('hidden');document.body.classList.remove('no-scroll')}
async function photo(file){const allowed=['image/png','image/jpeg','image/webp'];if(!allowed.includes(file.type))throw Error('Solo se permiten fotos JPG, PNG o WebP.');if(file.size>4*1024*1024)throw Error('La imagen debe pesar menos de 4 MB.');let ext=({'image/jpeg':'jpg','image/png':'png','image/webp':'webp'})[file.type],path=`perfumes/${uid()}.${ext}`;let {error}=await db.storage.from('product-images').upload(path,file,{contentType:file.type,upsert:false,cacheControl:'3600'});if(error)throw error;return {url:db.storage.from('product-images').getPublicUrl(path).data.publicUrl,path}}
async function saveProduct(e){e.preventDefault();const b=$('#editor-save');b.disabled=true;b.textContent='Guardando...';$('#editor-message').textContent='';let uploaded=null;try{
  let row={};for(const [key,selector] of Object.entries(fields)){let el=$(selector);row[key]=el.type==='checkbox'?el.checked:el.value.trim()}
  row.name=row.name.trim();row.brand=row.brand.trim();row.price_retail=Number(row.price_retail);row.price_wholesale=Number(row.price_wholesale)||0;row.wholesale_min_qty=Number(row.wholesale_min_qty);row.stock=Number(row.stock);row.size_ml=Number(row.size_ml);row.notes=row.notes.split(',').map(x=>x.trim()).filter(Boolean);
  if(!row.name||!row.brand||!Number.isFinite(row.price_retail)||row.price_retail<=0)throw Error('Completa nombre, marca y precio válido al detal.');
  if(row.price_wholesale>row.price_retail)throw Error('El precio al mayor no puede superar el precio al detal.');
  if(row.price_wholesale<0||row.stock<0||row.wholesale_min_qty<2)throw Error('Revisa los valores de stock, precio y cantidad mínima.');
  let original=S.products.find(p=>p.id===S.edit);row.image_url=$('#p-image-url').value.trim()||original?.image_url||'';if(row.image_url&&!/^https?:\/\//i.test(row.image_url))throw Error('La URL de la imagen debe comenzar con https://');
  if($('#p-photo').files[0]){uploaded=await photo($('#p-photo').files[0]);row.image_url=uploaded.url}
  // Guardado real + SELECT verifica que la fila final corresponda a lo solicitado.
  let result=S.edit?await db.from('products').update(row).eq('id',S.edit).select('*').single():await db.from('products').insert(row).select('*').single();
  if(result.error)throw result.error;
  const saved=result.data;
  if(saved.name!==row.name||Number(saved.price_retail)!==row.price_retail||Number(saved.price_wholesale)!==row.price_wholesale)throw Error('La comprobación posterior al guardado no coincide con los precios enviados.');
  await reload();closeEditor();tab('products');notice('Guardado y comprobado en Supabase. La tienda mostrará el nuevo valor al recargarse.');
 }catch(err){if(uploaded){await db.storage.from('product-images').remove([uploaded.path]).catch(()=>{})}$('#editor-message').textContent='No se guardó el perfume: '+errorText(err);notice('No se pudo guardar el cambio','error')}
 finally{b.disabled=false;b.textContent='Guardar y comprobar ↗'}}
async function toggleVisibility(id){let p=S.products.find(x=>x.id===id);if(!p)return;let {data,error}=await db.from('products').update({active:!p.active}).eq('id',id).select('id,active').single();if(error||!data||data.active===p.active){notice('No se pudo actualizar visibilidad: '+errorText(error),'error');return}await reload();notice(data.active?'El producto ya aparece en la tienda':'El producto quedó oculto')}
async function changeStatus(id,status){let existing=S.orders.find(x=>x.id===id);if(!existing||status===existing.status)return;let {data,error}=await db.from('orders').update({status}).eq('id',id).select('id,status').single();if(error||data?.status!==status){notice('El pedido no cambió: '+errorText(error),'error');renderOrders();return}await reload();notice('Pedido actualizado a '+status)}
async function deleteProduct(id){
 const p=S.products.find(x=>x.id===id);if(!p)return;
 if(!window.confirm(`¿Eliminar definitivamente «${p.name}» del catálogo? Esta acción no se puede deshacer. Los pedidos históricos conservarán su información.`))return;
 const {data,error}=await db.from('products').delete().eq('id',id).select('id').single();
 if(error||!data){notice('No se eliminó: '+errorText(error),'error');return;}
 await reload();notice('Producto eliminado correctamente de Supabase.');
}
function exportProducts(){
 const cols=['name','brand','family','gender','concentration','size_ml','price_retail','price_wholesale','wholesale_min_qty','stock','image_url','active','featured','notes','description'];
 const val=v=>`"${String(Array.isArray(v)?v.join(' | '):v??'').replaceAll('"','""')}"`;
 const body=[cols.join(','),...S.products.map(p=>cols.map(k=>val(p[k])).join(','))].join('\r\n');
 const a=document.createElement('a'),url=URL.createObjectURL(new Blob(['\ufeff'+body],{type:'text/csv;charset=utf-8'}));
 a.href=url;a.download=`dubaiparfums_catalogo_${new Date().toISOString().slice(0,10)}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);
 notice('Catálogo exportado desde Supabase.');
}
function events(){
 $('#admin-login').onsubmit=login;$('#admin-logout').onclick=async()=>{await db.auth.signOut();location.reload()};
 document.querySelectorAll('.admin-nav').forEach(b=>b.onclick=()=>tab(b.dataset.tab));
 $('#overview-add').onclick=()=>{tab('products');editor()};$('#overview-refresh').onclick=()=>reload().then(()=>notice('Datos actualizados'));
 $('#new-product').onclick=()=>editor();$('#admin-search').oninput=renderProducts;$('#admin-reload').onclick=()=>reload().then(()=>notice('Catálogo actualizado'));
 $('#orders-reload').onclick=()=>loadOrders().then(()=>notice('Pedidos actualizados'));$('#export-products').onclick=exportProducts;
 $('#admin-product-rows').onclick=e=>{let b=e.target.closest('[data-action]');if(!b)return;let p=S.products.find(x=>x.id===b.dataset.id);if(!p)return;if(b.dataset.action==='edit')editor(p);else if(b.dataset.action==='delete')deleteProduct(p.id);else toggleVisibility(p.id)};
 $('#admin-order-rows').onchange=e=>{let select=e.target.closest('select[data-id]');if(select)changeStatus(select.dataset.id,select.value)};
 $('#editor-close').onclick=closeEditor;$('#editor-cancel').onclick=closeEditor;
 $('#editor-overlay').onclick=e=>{if(e.target.id==='editor-overlay')closeEditor()};$('#product-form').onsubmit=saveProduct;
 $('#p-photo').onchange=e=>{let f=e.target.files?.[0];if(!f)return;if(!['image/png','image/jpeg','image/webp'].includes(f.type)||f.size>4*1024*1024){notice('Imagen inválida o superior a 4 MB','error');e.target.value='';return}$('#p-preview').src=URL.createObjectURL(f)};
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closeEditor()});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&S.user)reload()});
}
events();checkSession();
