// RolSes ödeme fonksiyonu (Supabase Edge Function, Deno).
//
// Eylemler:
//   init          → görev veren ödeme başlatır (iyzico ödeme sayfası ya da test modunda anında bloke)
//   callback      → iyzico ödeme sonrası buraya döner; ödeme doğrulanır, iş "funded" olur
//   approve       → görev veren teslimi onaylar; iyzico'da para yeteneğe serbest bırakılır
//   auto-approve  → 72 saat yanıtsız teslimleri onaylar (zamanlanmış görevle çağrılır)
//   register-payout → yetenek ödeme alabilmek için iyzico alt üye işyeri olur (IBAN bizde saklanmaz)
//
// Ortam değişkenleri (Supabase > Edge Functions > Secrets):
//   PAYMENTS_MODE   = test | iyzico   (varsayılan test: gerçek para çekilmez)
//   IYZICO_API_KEY, IYZICO_SECRET_KEY, IYZICO_BASE_URL (sandbox: https://sandbox-api.iyzipay.com)
//   CRON_SECRET     = auto-approve çağrısı için gizli anahtar
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY (Supabase otomatik verir)

import { createClient } from 'npm:@supabase/supabase-js@2';

const MODE = Deno.env.get('PAYMENTS_MODE') ?? 'test';
const IYZ_KEY = Deno.env.get('IYZICO_API_KEY') ?? '';
const IYZ_SECRET = Deno.env.get('IYZICO_SECRET_KEY') ?? '';
const IYZ_BASE = Deno.env.get('IYZICO_BASE_URL') ?? 'https://sandbox-api.iyzipay.com';
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// ---------- iyzico istemcisi (IYZWSv2 imzası) ----------
async function hmacHex(key: string, data: string) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function iyzico(path: string, body: Record<string, unknown>) {
  const payload = JSON.stringify(body);
  const rnd = `${Date.now()}${Math.random().toString(36).slice(2, 10)}`;
  const signature = await hmacHex(IYZ_SECRET, rnd + path + payload);
  const auth = btoa(`apiKey:${IYZ_KEY}&randomKey:${rnd}&signature:${signature}`);
  const res = await fetch(IYZ_BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `IYZWSv2 ${auth}`, 'x-iyzi-rnd': rnd },
    body: payload,
  });
  const data = await res.json();
  if (data.status !== 'success') throw new HttpError(400, `iyzico: ${data.errorMessage ?? 'bilinmeyen hata'}`);
  return data;
}

const money = (n: number) => (Math.round(n * 100) / 100).toFixed(2);

// ---------- yardımcılar ----------
async function requireUser(req: Request) {
  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  const client = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, 'Giriş gerekli.');
  return data.user;
}

async function loadOrder(orderId: string) {
  const { data, error } = await admin.from('orders').select('*').eq('id', orderId).single();
  if (error || !data) throw new HttpError(404, 'İş bulunamadı.');
  return data;
}

async function approve(order: Record<string, any>) {
  if (order.status !== 'delivered') throw new HttpError(400, 'Onaylanacak teslim yok.');
  if (MODE === 'iyzico') {
    if (!order.payment_item_ref) throw new HttpError(400, 'Ödeme kaydı eksik.');
    await iyzico('/payment/iyzipos/item/approve', {
      locale: 'tr',
      conversationId: order.id,
      paymentTransactionId: order.payment_item_ref,
    });
  }
  const { error } = await admin.rpc('mark_order_approved', { p_order: order.id });
  if (error) throw new HttpError(400, error.message);
}

// ---------- eylemler ----------
async function init(req: Request, body: Record<string, any>) {
  const user = await requireUser(req);
  const order = await loadOrder(body.orderId);
  if (order.owner_id !== user.id) throw new HttpError(403, 'Bu ödemeyi yalnızca görev veren yapabilir.');
  if (order.status !== 'awaiting_payment') throw new HttpError(400, 'Bu iş için ödeme zaten yapıldı.');

  if (MODE !== 'iyzico') {
    const { error } = await admin.rpc('mark_order_funded', {
      p_order: order.id,
      p_payment_ref: `test-${crypto.randomUUID()}`,
      p_item_ref: null,
    });
    if (error) throw new HttpError(400, error.message);
    return json({ funded: true });
  }

  const { data: talent } = await admin.from('profiles').select('submerchant_key').eq('id', order.talent_id).single();
  if (!talent?.submerchant_key) {
    throw new HttpError(400, 'Seçilen yetenek henüz ödeme bilgilerini tamamlamadı. Kendisine mesajla hatırlatın.');
  }
  const { data: role } = await admin.from('roles').select('name').eq('id', order.role_id).single();
  const amount = Number(order.amount);
  const fee = Number(order.owner_fee);
  const commission = Number(order.talent_commission);
  const callbackUrl =
    `${SUPABASE_URL}/functions/v1/payments?action=callback&orderId=${order.id}` +
    `&returnUrl=${encodeURIComponent(body.returnUrl ?? '')}`;
  const name = (user.user_metadata?.full_name ?? user.email ?? 'RolSes Kullanıcı').split(' ');

  const data = await iyzico('/payment/iyzipos/checkoutform/initialize/auth/ecom', {
    locale: 'tr',
    conversationId: order.id,
    price: money(amount),
    paidPrice: money(amount + fee),
    currency: 'TRY',
    basketId: order.id,
    paymentGroup: 'PRODUCT',
    callbackUrl,
    enabledInstallments: [1],
    buyer: {
      id: user.id,
      name: name[0] || 'RolSes',
      surname: name.slice(1).join(' ') || 'Kullanıcı',
      email: user.email,
      identityNumber: '11111111111', // TCKN istenmiyorsa iyzico'nun kabul ettiği varsayılan değer
      registrationAddress: 'Türkiye',
      city: 'Istanbul',
      country: 'Turkey',
      ip: req.headers.get('x-forwarded-for')?.split(',')[0] ?? '85.34.78.112',
    },
    billingAddress: { contactName: name.join(' '), city: 'Istanbul', country: 'Turkey', address: 'Türkiye' },
    basketItems: [
      {
        id: order.role_id,
        name: `Seslendirme: ${role?.name ?? 'rol'}`,
        category1: 'Seslendirme',
        itemType: 'VIRTUAL',
        price: money(amount),
        subMerchantKey: talent.submerchant_key,
        subMerchantPrice: money(amount - commission),
      },
    ],
  });
  return json({ paymentPageUrl: data.paymentPageUrl, funded: false });
}

async function callback(req: Request, url: URL) {
  const orderId = url.searchParams.get('orderId') ?? '';
  const returnUrl = url.searchParams.get('returnUrl') ?? '';
  const form = await req.formData();
  const token = String(form.get('token') ?? '');
  let ok = false;
  try {
    const data = await iyzico('/payment/iyzipos/checkoutform/auth/ecom/detail', {
      locale: 'tr',
      conversationId: orderId,
      token,
    });
    if (data.paymentStatus === 'SUCCESS' && data.basketId === orderId) {
      const item = data.itemTransactions?.[0];
      const { error } = await admin.rpc('mark_order_funded', {
        p_order: orderId,
        p_payment_ref: String(data.paymentId),
        p_item_ref: item ? String(item.paymentTransactionId) : null,
      });
      ok = !error;
    }
  } catch (e) {
    console.error('callback', e);
  }
  const target = returnUrl ? `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}payment=${ok ? 'ok' : 'fail'}` : '';
  if (target) return Response.redirect(target, 303);
  return new Response(ok ? 'Ödeme alındı. Uygulamaya dönebilirsiniz.' : 'Ödeme tamamlanamadı.', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

async function approveAction(req: Request, body: Record<string, any>) {
  const user = await requireUser(req);
  const order = await loadOrder(body.orderId);
  if (order.owner_id !== user.id) throw new HttpError(403, 'Onayı yalnızca görev veren verebilir.');
  await approve(order);
  return json({ ok: true });
}

async function autoApprove(req: Request) {
  if (!CRON_SECRET || req.headers.get('x-cron-secret') !== CRON_SECRET) throw new HttpError(401, 'Yetkisiz.');
  const cutoff = new Date(Date.now() - 72 * 3600_000).toISOString();
  const { data } = await admin.from('orders').select('*').eq('status', 'delivered').lt('delivered_at', cutoff);
  let count = 0;
  for (const o of data ?? []) {
    try {
      await approve(o);
      count++;
    } catch (e) {
      console.error('auto-approve', o.id, e);
    }
  }
  return json({ approved: count });
}

async function registerPayout(req: Request, body: Record<string, any>) {
  const user = await requireUser(req);
  if (MODE !== 'iyzico') {
    await admin.from('profiles').update({ submerchant_key: `test-${user.id}` }).eq('id', user.id);
    return json({ ok: true });
  }
  const required = ['name', 'surname', 'identityNumber', 'iban', 'gsmNumber', 'address'];
  for (const k of required) if (!body[k]) throw new HttpError(400, `Eksik alan: ${k}`);
  const data = await iyzico('/onboarding/submerchant', {
    locale: 'tr',
    conversationId: user.id,
    subMerchantExternalId: user.id,
    subMerchantType: 'PERSONAL',
    name: `${body.name} ${body.surname}`,
    contactName: body.name,
    contactSurname: body.surname,
    email: user.email,
    gsmNumber: body.gsmNumber,
    address: body.address,
    iban: String(body.iban).replace(/\s/g, ''),
    identityNumber: body.identityNumber,
    currency: 'TRY',
  });
  await admin.from('profiles').update({ submerchant_key: data.subMerchantKey }).eq('id', user.id);
  return json({ ok: true });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const url = new URL(req.url);
  try {
    if (url.searchParams.get('action') === 'callback') return await callback(req, url);
    const body = await req.json().catch(() => ({}));
    switch (body.action) {
      case 'init':
        return await init(req, body);
      case 'approve':
        return await approveAction(req, body);
      case 'auto-approve':
        return await autoApprove(req);
      case 'register-payout':
        return await registerPayout(req, body);
      default:
        return json({ error: 'Bilinmeyen işlem.' }, 400);
    }
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    console.error(e);
    return json({ error: e instanceof Error ? e.message : 'Sunucu hatası' }, status);
  }
});
