import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, DUBAIPARFUMS_PROJECT_REF } from './supabase-config.js';

export const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(SUPABASE_URL.trim()) && /^sb_publishable_/.test(SUPABASE_PUBLISHABLE_KEY.trim()) && DUBAIPARFUMS_PROJECT_REF.length > 8 && new URL(SUPABASE_URL).hostname === `${DUBAIPARFUMS_PROJECT_REF}.supabase.co` && DUBAIPARFUMS_PROJECT_REF !== 'kzmxafjlhruldzzntugu';
export const db = configured ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
}) : null;

// Segundo cinturón de seguridad: el proyecto debe declararse expresamente DUBAIPARFUMS.
// Nunca consultar ni escribir productos de un proyecto cuya identidad no se ha verificado.
let identityPromise;
export function verifyStoreIdentity() {
  if (!configured || !db) return Promise.resolve({ok:false, reason:'Falta configurar una base Supabase independiente de DubaiParfums.'});
  if (!identityPromise) identityPromise = (async () => {
    try {
      const {data,error} = await db.from('store_identity').select('store_code').eq('id',1).maybeSingle();
      if (error) return {ok:false,reason:'No se pudo verificar la identidad de esta base: '+error.message};
      return data?.store_code === 'DUBAIPARFUMS'
        ? {ok:true,reason:'Base de DubaiParfums verificada.'}
        : {ok:false,reason:'CONEXIÓN BLOQUEADA: esta base no pertenece a DubaiParfums.'};
    } catch (error) {
      return {ok:false,reason:'No se pudo verificar la identidad del proyecto: '+(error?.message||error)};
    }
  })();
  return identityPromise;
}

export const money = value => new Intl.NumberFormat('es-CO', {style:'currency',currency:'COP',maximumFractionDigits:0}).format(Number(value)||0);
export const escapeHTML = input => String(input ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
export const safeImage = url => {
  if (!url) return './assets/noir-product.svg';
  try { const u = new URL(url, location.href); return ['https:', 'http:'].includes(u.protocol) ? u.href : './assets/noir-product.svg'; }
  catch { return './assets/noir-product.svg'; }
};
export const uid = () => crypto.randomUUID();
export function unitPrice(product, quantity = 1) {
  const min = Math.max(2, Number(product.wholesale_min_qty)||6);
  const retail = Number(product.price_retail) || 0;
  const wholesale = Number(product.price_wholesale) || 0;
  return wholesale > 0 && wholesale < retail && quantity >= min ? wholesale : retail;
}
export function notice(message, type = 'success') {
  let toast = document.querySelector('#global-toast');
  if (!toast) { toast = document.createElement('div'); toast.id = 'global-toast'; toast.className = 'toast'; toast.setAttribute('role','status'); document.body.appendChild(toast); }
  toast.textContent = message; toast.dataset.type = type; toast.classList.add('show');
  clearTimeout(window.__toastTimer); window.__toastTimer = setTimeout(()=>toast.classList.remove('show'), 4200);
}
export function readLocal(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
export function writeLocal(key,value) { localStorage.setItem(key, JSON.stringify(value)); }
import { referenceProducts } from './catalogo-referencia.js';
export const demoProducts = referenceProducts;
