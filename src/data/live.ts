// CANLI mod: Supabase (veritabanı, giriş, dosya) + Edge Function (ödeme).
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import type { Application, LocalMedia, Message, Order, Profile, Task } from '../types';
import type { Api } from './api';
import { supabase } from './supabaseClient';
import { findContactInfo, CONTACT_WARNING } from '../lib/moderation';
import { uid } from '../lib/id';

WebBrowser.maybeCompleteAuthSession();

function db() {
  if (!supabase) throw new Error('Supabase ayarlı değil.');
  return supabase;
}

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

async function me(): Promise<string> {
  const { data } = await db().auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error('Önce giriş yapın.');
  return id;
}

function extFor(media: LocalMedia) {
  const fromName = media.name.split('.').pop();
  if (fromName && fromName.length <= 5 && fromName !== media.name) return fromName.toLowerCase();
  if (media.mimeType.includes('webm')) return 'webm';
  if (media.mimeType.includes('mp4') || media.mimeType.includes('m4a')) return 'm4a';
  if (media.mimeType.includes('mpeg')) return 'mp3';
  if (media.mimeType.includes('wav')) return 'wav';
  return 'bin';
}

async function upload(media: LocalMedia, folder: string): Promise<string> {
  const userId = await me();
  const path = `${userId}/${folder}/${uid()}.${extFor(media)}`;
  const body = await fetch(media.uri).then((r) => r.arrayBuffer());
  check(
    await db().storage.from('media').upload(path, body, {
      contentType: media.mimeType || 'application/octet-stream',
      upsert: false,
    }),
  );
  return path;
}

function webRedirect() {
  if (typeof window === 'undefined') return undefined;
  const base = process.env.EXPO_PUBLIC_BASE_URL || '';
  return `${window.location.origin}${base}/`;
}

const TASK_SELECT =
  '*, roles(*), owner:profiles!tasks_owner_id_fkey(id, display_name, rating_avg, rating_count)';
const ORDER_SELECT =
  '*, role:roles(id, name, lines), task:tasks(id, title, type), owner:profiles!orders_owner_id_fkey(id, display_name), talent:profiles!orders_talent_id_fkey(id, display_name)';

function sortRoles(t: Task): Task {
  return { ...t, roles: [...(t.roles || [])].sort((a, b) => (a.name > b.name ? 1 : -1)) };
}

async function callPayments(body: Record<string, unknown>) {
  const { data, error } = await db().functions.invoke('payments', { body });
  if (error) {
    let msg = error.message;
    try {
      const ctx = (error as unknown as { context?: Response }).context;
      if (ctx && typeof ctx.json === 'function') {
        const j = await ctx.json();
        if (j?.error) msg = j.error;
      }
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
  return data as { paymentPageUrl?: string; funded?: boolean; ok?: boolean };
}

export const liveApi: Api = {
  mode: 'live',

  async currentUserId() {
    const { data } = await db().auth.getSession();
    return data.session?.user.id ?? null;
  },
  onAuthChange(cb) {
    const { data } = db().auth.onAuthStateChange((_event, session) => cb(session?.user.id ?? null));
    return () => data.subscription.unsubscribe();
  },
  async signInWithGoogle() {
    if (Platform.OS === 'web') {
      check(
        await db().auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: webRedirect() },
        }),
      );
      return;
    }
    const redirectTo = Linking.createURL('auth-callback');
    const { data, error } = await db().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data?.url) throw new Error(error?.message || 'Google girişi başlatılamadı.');
    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (res.type !== 'success') return;
    const parsed = Linking.parse(res.url);
    const code = parsed.queryParams?.code;
    if (typeof code === 'string') {
      check(await db().auth.exchangeCodeForSession(code));
      return;
    }
    // Eski (implicit) akış: belirteçler # sonrasında gelir.
    const hash = res.url.split('#')[1] || '';
    const params = new URLSearchParams(hash);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (access_token && refresh_token) {
      check(await db().auth.setSession({ access_token, refresh_token }));
    } else {
      throw new Error('Google girişi tamamlanamadı.');
    }
  },
  async signInWithEmail(email, password) {
    check(await db().auth.signInWithPassword({ email, password }));
  },
  async signUpWithEmail(email, password, displayName) {
    const res = await db().auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName }, emailRedirectTo: webRedirect() },
    });
    check(res);
    if (!res.data.session) {
      throw new Error('Kayıt alındı. E-postanıza gelen bağlantıya tıklayıp ardından giriş yapın.');
    }
  },
  async signOut() {
    await db().auth.signOut();
  },
  demoUsers() {
    return [];
  },
  async switchDemoUser() {
    throw new Error('Canlı modda demo kullanıcı yok.');
  },

  async getProfile(id) {
    return check(await db().from('profiles').select('*').eq('id', id).maybeSingle()) as Profile | null;
  },
  async updateMyProfile(patch, demo) {
    const id = await me();
    const allowed: Partial<Profile> = {
      display_name: patch.display_name,
      bio: patch.bio,
      city: patch.city,
      gender: patch.gender,
      voice_tags: patch.voice_tags,
      is_talent: patch.is_talent,
    };
    Object.keys(allowed).forEach((k) => {
      const key = k as keyof Profile;
      if (allowed[key] === undefined) delete allowed[key];
    });
    if (demo) (allowed as Profile).demo_path = await upload(demo, 'demo');
    check(await db().from('profiles').update(allowed).eq('id', id));
  },
  async listReviewsFor(userId) {
    return check(
      await db().from('reviews').select('*').eq('to_id', userId).order('created_at', { ascending: false }).limit(50),
    );
  },

  async listTasks(filter) {
    let q = db().from('tasks').select(TASK_SELECT).in('status', ['open', 'in_progress']);
    if (filter.type && filter.type !== 'all') q = q.eq('type', filter.type);
    const search = (filter.search || '').trim().replace(/[%,()]/g, ' ');
    if (search) q = q.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    const rows = check(await q.order('created_at', { ascending: false }).limit(100)) as unknown as Task[];
    return rows
      .map(sortRoles)
      .filter((t) => t.roles.some((r) => r.status === 'open'))
      .filter(
        (t) =>
          !filter.gender ||
          t.roles.some((r) => r.status === 'open' && (r.gender_pref === filter.gender || r.gender_pref === '')),
      )
      .filter((t) => !filter.minBudget || t.roles.some((r) => Number(r.budget) >= (filter.minBudget || 0)));
  },
  async getTask(id) {
    const t = check(await db().from('tasks').select(TASK_SELECT).eq('id', id).maybeSingle()) as unknown as Task | null;
    return t ? sortRoles(t) : null;
  },
  async createTask(input) {
    const owner = await me();
    const task = check(
      await db()
        .from('tasks')
        .insert({
          owner_id: owner,
          type: input.type,
          title: input.title,
          description: input.description,
          video_url: input.video_url,
          language: input.language,
          deadline: input.deadline,
          mature: input.mature,
        })
        .select('id')
        .single(),
    ) as { id: string };
    check(
      await db()
        .from('roles')
        .insert(input.roles.map((r) => ({ ...r, task_id: task.id }))),
    );
    return task.id;
  },
  async cancelTask(id) {
    const owner = await me();
    const busy = check(
      await db().from('orders').select('id').eq('task_id', id).in('status', ['funded', 'delivered', 'revision']),
    ) as { id: string }[];
    if (busy.length) throw new Error('Ödemesi yapılmış, süren işleri olan görev iptal edilemez.');
    check(await db().from('tasks').update({ status: 'cancelled' }).eq('id', id).eq('owner_id', owner));
  },
  async listMyTasks() {
    const owner = await me();
    const rows = check(
      await db().from('tasks').select(TASK_SELECT).eq('owner_id', owner).order('created_at', { ascending: false }),
    ) as unknown as Task[];
    return rows.map(sortRoles);
  },

  async apply(roleId, input) {
    const talent = await me();
    if (input.note && findContactInfo(input.note)) throw new Error(CONTACT_WARNING);
    const role = check(await db().from('roles').select('id, task_id').eq('id', roleId).single()) as {
      id: string;
      task_id: string;
    };
    let media_path: string | null = null;
    let media_kind: Application['media_kind'] = 'link';
    if (input.media) {
      media_path = await upload(input.media, 'auditions');
      media_kind = input.media.mimeType.startsWith('video') ? 'video' : 'audio';
    }
    const res = await db().from('applications').insert({
      role_id: role.id,
      task_id: role.task_id,
      talent_id: talent,
      media_path,
      media_kind,
      link: input.link || '',
      note: input.note || '',
    });
    if (res.error?.code === '23505') throw new Error('Bu role zaten başvurdunuz.');
    if (res.error) throw new Error('Başvuru gönderilemedi: rol kapanmış ya da kendi görevinize başvuruyor olabilirsiniz.');
  },
  async listApplicationsForTask(taskId) {
    return check(
      await db()
        .from('applications')
        .select('*, talent:profiles!applications_talent_id_fkey(id, display_name, rating_avg, rating_count, voice_tags)')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false }),
    ) as unknown as Application[];
  },
  async listMyApplications() {
    const talent = await me();
    const rows = check(
      await db()
        .from('applications')
        .select('*, task:tasks(title), role:roles(name)')
        .eq('talent_id', talent)
        .order('created_at', { ascending: false }),
    ) as unknown as (Application & { task: { title: string } | null; role: { name: string } | null })[];
    return rows.map(({ task, role, ...a }) => ({ ...a, task_title: task?.title ?? '', role_name: role?.name ?? '' }));
  },
  async setApplicationStatus(id, status) {
    check(await db().from('applications').update({ status }).eq('id', id));
  },
  async selectApplication(id) {
    return check(await db().rpc('select_application', { p_application: id })) as string;
  },

  async listMyOrders() {
    const user = await me();
    return check(
      await db()
        .from('orders')
        .select(ORDER_SELECT)
        .or(`owner_id.eq.${user},talent_id.eq.${user}`)
        .order('created_at', { ascending: false }),
    ) as unknown as Order[];
  },
  async getOrder(id) {
    return check(await db().from('orders').select(ORDER_SELECT).eq('id', id).maybeSingle()) as unknown as Order | null;
  },
  async payOrder(id) {
    const returnUrl = Platform.OS === 'web' ? `${webRedirect()}order/${id}` : Linking.createURL(`order/${id}`);
    const data = await callPayments({ action: 'init', orderId: id, returnUrl });
    return { paymentPageUrl: data.paymentPageUrl, funded: Boolean(data.funded) };
  },
  async deliverOrder(id, media, note) {
    if (note && findContactInfo(note)) throw new Error(CONTACT_WARNING);
    const path = await upload(media, 'deliveries');
    check(await db().rpc('deliver_order', { p_order: id, p_path: path, p_note: note }));
  },
  async requestRevision(id, note) {
    if (note && findContactInfo(note)) throw new Error(CONTACT_WARNING);
    check(await db().rpc('request_revision', { p_order: id, p_note: note }));
  },
  async approveOrder(id) {
    await callPayments({ action: 'approve', orderId: id });
  },

  async listMessages(orderId) {
    const rows = check(
      await db().from('messages').select('*').eq('order_id', orderId).order('created_at', { ascending: true }),
    ) as unknown as (Omit<Message, 'sender_id'> & { sender_id: string | null })[];
    // Sunucuda sistem mesajlarının göndereni boştur; arayüz 'system' olarak bekler.
    return rows.map((m) => ({ ...m, sender_id: m.sender_id ?? 'system' }));
  },
  async sendMessage(orderId, body) {
    if (findContactInfo(body)) throw new Error(CONTACT_WARNING);
    const user = await me();
    check(await db().from('messages').insert({ order_id: orderId, sender_id: user, body: body.trim() }));
  },
  async addReview(orderId, stars, comment) {
    const user = await me();
    // to_id sunucuda (tetikleyici) doğru kişiye ayarlanır.
    check(await db().from('reviews').insert({ order_id: orderId, from_id: user, to_id: user, stars, comment }));
  },
  async hasReviewed(orderId) {
    const user = await me();
    const rows = check(
      await db().from('reviews').select('id').eq('order_id', orderId).eq('from_id', user),
    ) as { id: string }[];
    return rows.length > 0;
  },

  async mediaUrl(path) {
    if (/^(https?:|data:|blob:|file:)/.test(path)) return path;
    const data = check(await db().storage.from('media').createSignedUrl(path, 3600)) as { signedUrl: string };
    return data.signedUrl;
  },
  async report(targetType, targetId, reason) {
    const user = await me();
    check(await db().from('reports').insert({ reporter_id: user, target_type: targetType, target_id: targetId, reason }));
  },
};
