// DEMO modu: Supabase anahtarı girilmeden uygulamanın tamamı cihazda çalışır.
// İki taraf da denenebilsin diye hazır kullanıcılar arasında geçiş yapılabilir.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type {
  Application,
  LocalMedia,
  Message,
  Order,
  Profile,
  Review,
  Role,
  Task,
} from '../types';
import type { Api, DemoUser } from './api';
import { uid, nowIso } from '../lib/id';
import { priceBreakdown, MAX_REVISIONS } from '../lib/pricing';
import { findContactInfo, CONTACT_WARNING } from '../lib/moderation';

const KEY = 'rolses-demo-v1';

interface DemoState {
  currentUserId: string | null;
  profiles: Profile[];
  tasks: Omit<Task, 'roles' | 'owner'>[];
  roles: Omit<Role, 'application_count'>[];
  applications: Omit<Application, 'talent'>[];
  orders: Omit<Order, 'role' | 'task' | 'owner' | 'talent'>[];
  messages: Message[];
  reviews: Review[];
}

const DEMO_USERS: DemoUser[] = [
  { id: 'u-deniz', display_name: 'Deniz Kaya', role_hint: 'İçerik üreticisi · görev veriyor' },
  { id: 'u-ece', display_name: 'Ece Ses', role_hint: 'Seslendirmen · başvuruyor' },
  { id: 'u-kerem', display_name: 'Kerem Dublaj', role_hint: 'Dublaj sanatçısı' },
];

function hoursAgo(h: number) {
  return new Date(Date.now() - h * 3600_000).toISOString();
}
function daysFromNow(d: number) {
  return new Date(Date.now() + d * 86400_000).toISOString().slice(0, 10);
}

function profile(p: Partial<Profile> & Pick<Profile, 'id' | 'display_name'>): Profile {
  return {
    bio: '',
    city: '',
    gender: '',
    voice_tags: [],
    demo_path: null,
    is_talent: false,
    rating_avg: 0,
    rating_count: 0,
    completed_count: 0,
    created_at: hoursAgo(24 * 40),
    ...p,
  };
}

function seed(): DemoState {
  const profiles = [
    profile({
      id: 'u-deniz',
      display_name: 'Deniz Kaya',
      bio: 'TikTok ve YouTube’da günlük hayat skeçleri çekiyorum. 180 bin takipçi.',
      city: 'İstanbul',
      rating_avg: 4.8,
      rating_count: 12,
    }),
    profile({
      id: 'u-ece',
      display_name: 'Ece Ses',
      bio: 'Konservatuvar tiyatro mezunu. Genç kadın, sıcak ve enerjik ses. Ev stüdyom var.',
      city: 'Ankara',
      gender: 'kadın',
      voice_tags: ['genç', 'enerjik', 'komedi', 'reklam'],
      is_talent: true,
      rating_avg: 4.9,
      rating_count: 31,
      completed_count: 34,
    }),
    profile({
      id: 'u-kerem',
      display_name: 'Kerem Dublaj',
      bio: '8 yıldır çizgi film ve oyun dublajı. Kalın, karakterli erkek sesi.',
      city: 'İzmir',
      gender: 'erkek',
      voice_tags: ['kalın', 'karakter', 'dram', 'oyun'],
      is_talent: true,
      rating_avg: 4.7,
      rating_count: 58,
      completed_count: 61,
    }),
  ];

  const t1 = 't-ayse';
  const t2 = 't-kahve';
  const t3 = 't-asansor';
  const tasks: DemoState['tasks'] = [
    {
      id: t1,
      owner_id: 'u-deniz',
      type: 'voice',
      title: 'Ayşe neden gelmedi? — 10 dk’lık okul koridoru skeci',
      description:
        'Dört kişilik bir skeç çektik, konuşmaları yeniden seslendirmek istiyoruz. Doğal, mahalle ağzı, abartısız. Teslim: her replik ayrı dosya, gürültüsüz.',
      video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      language: 'Türkçe',
      deadline: daysFromNow(5),
      mature: true,
      status: 'open',
      created_at: hoursAgo(3),
    },
    {
      id: t2,
      owner_id: 'u-deniz',
      type: 'voice',
      title: 'Kahve dükkanı için 30 sn Instagram reklamı',
      description: 'Sıcak, samimi bir kadın sesi arıyoruz. Metin kısa, enerji yüksek ama bağırmadan.',
      video_url: '',
      language: 'Türkçe',
      deadline: daysFromNow(3),
      mature: false,
      status: 'open',
      created_at: hoursAgo(20),
    },
    {
      id: t3,
      owner_id: 'u-deniz',
      type: 'script',
      title: 'Senaryo: Asansörde mahsur kalan iki yabancı (dikey, 2 dk)',
      description:
        'Senaryo hazır, çekecek ve oynayacak iki kişi arıyorum. Mekân: herhangi bir apartman asansörü ya da benzeri dar bir alan. Format 9:16. Ortak paylaşım (collab) yapılır.',
      video_url: '',
      language: 'Türkçe',
      deadline: daysFromNow(10),
      mature: false,
      status: 'open',
      created_at: hoursAgo(30),
    },
  ];

  const roles: DemoState['roles'] = [
    {
      id: 'r-ahmet',
      task_id: t1,
      name: 'Ahmet',
      description: 'Lise son, sınıfın dertlisi. Sinirlenince sesi çatallaşıyor.',
      gender_pref: 'erkek',
      budget: 150,
      lines: [
        { text: 'Ayşe bugün gelmiyormuş, neden?', emotion: 'kızgın' },
        { text: 'Dün akşam bir şey olmuş, eminim.', emotion: 'endişeli' },
      ],
      status: 'open',
      talent_id: null,
    },
    {
      id: 'r-yusuf',
      task_id: t1,
      name: 'Yusuf',
      description: 'Umursamaz, alaycı, her şeye espri yapan arkadaş.',
      gender_pref: 'erkek',
      budget: 120,
      lines: [{ text: 'Ne bileyim be, ben Ayşe’nin bekçisi miyim?', emotion: 'alaycı, sinirli' }],
      status: 'open',
      talent_id: null,
    },
    {
      id: 'r-melike',
      task_id: t1,
      name: 'Melike',
      description: 'Sakin, sır saklayan, gizemli.',
      gender_pref: 'kadın',
      budget: 120,
      lines: [{ text: 'Ben biliyorum.', emotion: 'gizemli' }],
      status: 'open',
      talent_id: null,
    },
    {
      id: 'r-kahve',
      task_id: t2,
      name: 'Anlatıcı',
      description: '25–35 yaş, gülümseyen bir ses.',
      gender_pref: 'kadın',
      budget: 400,
      lines: [
        {
          text: 'Sabahın ilk yudumu burada başlar. Taze kavrulmuş çekirdekler, sıcak bir selam ve senin adınla yazılmış bir bardak.',
          emotion: 'sıcak, samimi',
        },
      ],
      status: 'open',
      talent_id: null,
    },
    {
      id: 'r-asansor-1',
      task_id: t3,
      name: 'Oyuncu 1 — Klostrofobik yönetici',
      description: '30–45 yaş, takım elbiseli, panik atak sınırında ama komik.',
      gender_pref: '',
      budget: 750,
      lines: [{ text: 'Lütfen biri şu alarm düğmesine bir daha bassın!', emotion: 'panik' }],
      status: 'open',
      talent_id: null,
    },
    {
      id: 'r-asansor-2',
      task_id: t3,
      name: 'Oyuncu 2 — Rahat kurye',
      description: '20–30 yaş, elinde pizza kutusu, aşırı sakin.',
      gender_pref: '',
      budget: 750,
      lines: [{ text: 'Abi sakin, pizza daha sıcak, sorun yok.', emotion: 'umursamaz' }],
      status: 'open',
      talent_id: null,
    },
  ];

  const applications: DemoState['applications'] = [
    {
      id: 'a-1',
      role_id: 'r-ahmet',
      task_id: t1,
      talent_id: 'u-kerem',
      media_path: null,
      media_kind: 'link',
      link: '',
      note: 'Ahmet’i biraz daha gergin, sesi titreyen biri gibi okudum. İstersen daha sakin bir versiyon da gönderirim.',
      status: 'pending',
      created_at: hoursAgo(2),
    },
  ];

  return {
    currentUserId: null,
    profiles,
    tasks,
    roles,
    applications,
    orders: [],
    messages: [],
    reviews: [],
  };
}

let state: DemoState | null = null;
const listeners = new Set<(id: string | null) => void>();

async function load(): Promise<DemoState> {
  if (state) return state;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    state = raw ? (JSON.parse(raw) as DemoState) : seed();
  } catch {
    state = seed();
  }
  return state;
}

async function save() {
  if (!state) return;
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Depolama doluysa (büyük ses dosyaları) demo yine bellekte çalışır.
  }
}

async function me(): Promise<string> {
  const s = await load();
  if (!s.currentUserId) throw new Error('Önce giriş yapın.');
  return s.currentUserId;
}

/** Web'de kayıtlar geçici blob: adresiyle gelir; kalıcı olsun diye data: adresine çevrilir. */
async function persistMedia(media: LocalMedia): Promise<string> {
  if (Platform.OS === 'web' && media.uri.startsWith('blob:')) {
    const blob = await (await fetch(media.uri)).blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }
  return media.uri;
}

function pickOwner(s: DemoState, id: string) {
  const p = s.profiles.find((x) => x.id === id);
  return p
    ? { id: p.id, display_name: p.display_name, rating_avg: p.rating_avg, rating_count: p.rating_count }
    : undefined;
}

function hydrateTask(s: DemoState, t: DemoState['tasks'][number]): Task {
  const roles = s.roles
    .filter((r) => r.task_id === t.id)
    .map((r) => ({
      ...r,
      application_count: s.applications.filter((a) => a.role_id === r.id).length,
    }));
  return { ...t, roles, owner: pickOwner(s, t.owner_id) };
}

function hydrateOrder(s: DemoState, o: DemoState['orders'][number]): Order {
  const role = s.roles.find((r) => r.id === o.role_id);
  const task = s.tasks.find((t) => t.id === o.task_id);
  const owner = s.profiles.find((p) => p.id === o.owner_id);
  const talent = s.profiles.find((p) => p.id === o.talent_id);
  return {
    ...o,
    role: role && { id: role.id, name: role.name, lines: role.lines },
    task: task && { id: task.id, title: task.title, type: task.type },
    owner: owner && { id: owner.id, display_name: owner.display_name },
    talent: talent && { id: talent.id, display_name: talent.display_name },
  };
}

function updateTaskStatus(s: DemoState, taskId: string) {
  const task = s.tasks.find((t) => t.id === taskId);
  if (!task || task.status === 'cancelled') return;
  const roles = s.roles.filter((r) => r.task_id === taskId);
  if (roles.length && roles.every((r) => r.status === 'approved')) task.status = 'completed';
  else if (roles.some((r) => r.status !== 'open')) task.status = 'in_progress';
  else task.status = 'open';
}

function getOrderOrThrow(s: DemoState, id: string) {
  const o = s.orders.find((x) => x.id === id);
  if (!o) throw new Error('İş bulunamadı.');
  return o;
}

export const demoApi: Api = {
  mode: 'demo',

  async currentUserId() {
    return (await load()).currentUserId;
  },
  onAuthChange(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  async signInWithGoogle() {
    await demoApi.switchDemoUser('u-deniz');
  },
  async signInWithEmail() {
    await demoApi.switchDemoUser('u-ece');
  },
  async signUpWithEmail(_email, _password, displayName) {
    const s = await load();
    const id = uid('u-');
    s.profiles.push(profile({ id, display_name: displayName || 'Yeni kullanıcı', created_at: nowIso() }));
    await save();
    await demoApi.switchDemoUser(id);
  },
  async signOut() {
    const s = await load();
    s.currentUserId = null;
    await save();
    listeners.forEach((l) => l(null));
  },
  demoUsers() {
    return DEMO_USERS;
  },
  async switchDemoUser(id) {
    const s = await load();
    s.currentUserId = id;
    await save();
    listeners.forEach((l) => l(id));
  },

  async getProfile(id) {
    const s = await load();
    return s.profiles.find((p) => p.id === id) ?? null;
  },
  async updateMyProfile(patch, demo) {
    const s = await load();
    const id = await me();
    const p = s.profiles.find((x) => x.id === id);
    if (!p) throw new Error('Profil bulunamadı.');
    Object.assign(p, patch, { id });
    if (demo) p.demo_path = await persistMedia(demo);
    await save();
  },
  async listReviewsFor(userId) {
    const s = await load();
    return s.reviews.filter((r) => r.to_id === userId).sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async listTasks(filter) {
    const s = await load();
    const q = (filter.search || '').trim().toLocaleLowerCase('tr');
    return s.tasks
      .filter((t) => t.status === 'open' || t.status === 'in_progress')
      .filter((t) => !filter.type || filter.type === 'all' || t.type === filter.type)
      .map((t) => hydrateTask(s, t))
      .filter((t) => t.roles.some((r) => r.status === 'open'))
      .filter((t) => {
        if (!q) return true;
        const hay = [t.title, t.description, ...t.roles.map((r) => r.name)].join(' ').toLocaleLowerCase('tr');
        return hay.includes(q);
      })
      .filter((t) => !filter.gender || t.roles.some((r) => r.status === 'open' && (r.gender_pref === filter.gender || r.gender_pref === '')))
      .filter((t) => !filter.minBudget || t.roles.some((r) => r.budget >= (filter.minBudget || 0)))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  async getTask(id) {
    const s = await load();
    const t = s.tasks.find((x) => x.id === id);
    return t ? hydrateTask(s, t) : null;
  },
  async createTask(input) {
    const s = await load();
    const owner = await me();
    const id = uid('t-');
    s.tasks.push({
      id,
      owner_id: owner,
      type: input.type,
      title: input.title,
      description: input.description,
      video_url: input.video_url,
      language: input.language,
      deadline: input.deadline,
      mature: input.mature,
      status: 'open',
      created_at: nowIso(),
    });
    for (const r of input.roles) {
      s.roles.push({ ...r, id: uid('r-'), task_id: id, status: 'open', talent_id: null });
    }
    await save();
    return id;
  },
  async cancelTask(id) {
    const s = await load();
    const owner = await me();
    const t = s.tasks.find((x) => x.id === id && x.owner_id === owner);
    if (!t) throw new Error('Görev bulunamadı.');
    if (s.orders.some((o) => o.task_id === id && ['funded', 'delivered', 'revision'].includes(o.status))) {
      throw new Error('Ödemesi yapılmış, süren işleri olan görev iptal edilemez.');
    }
    t.status = 'cancelled';
    await save();
  },
  async listMyTasks() {
    const s = await load();
    const owner = await me();
    return s.tasks
      .filter((t) => t.owner_id === owner)
      .map((t) => hydrateTask(s, t))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  async apply(roleId, input) {
    const s = await load();
    const talent = await me();
    const role = s.roles.find((r) => r.id === roleId);
    if (!role) throw new Error('Rol bulunamadı.');
    const task = s.tasks.find((t) => t.id === role.task_id);
    if (!task) throw new Error('Görev bulunamadı.');
    if (task.owner_id === talent) throw new Error('Kendi görevinize başvuramazsınız.');
    if (role.status !== 'open') throw new Error('Bu rol için seçim yapıldı.');
    if (s.applications.some((a) => a.role_id === roleId && a.talent_id === talent)) {
      throw new Error('Bu role zaten başvurdunuz.');
    }
    if (input.note && findContactInfo(input.note)) throw new Error(CONTACT_WARNING);
    let media_path: string | null = null;
    let media_kind: Application['media_kind'] = 'link';
    if (input.media) {
      media_path = await persistMedia(input.media);
      media_kind = input.media.mimeType.startsWith('video') ? 'video' : 'audio';
    }
    s.applications.push({
      id: uid('a-'),
      role_id: roleId,
      task_id: role.task_id,
      talent_id: talent,
      media_path,
      media_kind,
      link: input.link || '',
      note: input.note || '',
      status: 'pending',
      created_at: nowIso(),
    });
    const p = s.profiles.find((x) => x.id === talent);
    if (p) p.is_talent = true;
    await save();
  },
  async listApplicationsForTask(taskId) {
    const s = await load();
    const owner = await me();
    const task = s.tasks.find((t) => t.id === taskId);
    if (!task || task.owner_id !== owner) return [];
    return s.applications
      .filter((a) => a.task_id === taskId)
      .map((a) => {
        const p = s.profiles.find((x) => x.id === a.talent_id);
        return {
          ...a,
          talent: p && {
            id: p.id,
            display_name: p.display_name,
            rating_avg: p.rating_avg,
            rating_count: p.rating_count,
            voice_tags: p.voice_tags,
          },
        };
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  async listMyApplications() {
    const s = await load();
    const talent = await me();
    return s.applications
      .filter((a) => a.talent_id === talent)
      .map((a) => ({
        ...a,
        task_title: s.tasks.find((t) => t.id === a.task_id)?.title ?? '',
        role_name: s.roles.find((r) => r.id === a.role_id)?.name ?? '',
      }))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  async setApplicationStatus(id, status) {
    const s = await load();
    const owner = await me();
    const a = s.applications.find((x) => x.id === id);
    const task = a && s.tasks.find((t) => t.id === a.task_id);
    if (!a || !task || task.owner_id !== owner) throw new Error('Başvuru bulunamadı.');
    if (a.status === 'selected') throw new Error('Seçilen başvuru değiştirilemez.');
    a.status = status;
    await save();
  },
  async selectApplication(id) {
    const s = await load();
    const owner = await me();
    const a = s.applications.find((x) => x.id === id);
    const task = a && s.tasks.find((t) => t.id === a.task_id);
    const role = a && s.roles.find((r) => r.id === a.role_id);
    if (!a || !task || !role || task.owner_id !== owner) throw new Error('Başvuru bulunamadı.');
    if (role.status !== 'open') throw new Error('Bu rol için zaten seçim yapıldı.');
    const price = priceBreakdown(role.budget);
    a.status = 'selected';
    s.applications
      .filter((x) => x.role_id === role.id && x.id !== a.id && x.status !== 'rejected')
      .forEach((x) => (x.status = 'rejected'));
    role.status = 'cast';
    role.talent_id = a.talent_id;
    const orderId = uid('o-');
    s.orders.push({
      id: orderId,
      role_id: role.id,
      task_id: task.id,
      owner_id: owner,
      talent_id: a.talent_id,
      amount: role.budget,
      owner_fee: price.ownerFee,
      talent_commission: price.talentCommission,
      status: 'awaiting_payment',
      payment_ref: null,
      delivery_path: null,
      delivery_note: '',
      revision_count: 0,
      delivered_at: null,
      approved_at: null,
      created_at: nowIso(),
    });
    updateTaskStatus(s, task.id);
    await save();
    return orderId;
  },

  async listMyOrders() {
    const s = await load();
    const id = await me();
    return s.orders
      .filter((o) => o.owner_id === id || o.talent_id === id)
      .map((o) => hydrateOrder(s, o))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  async getOrder(id) {
    const s = await load();
    const user = await me();
    const o = s.orders.find((x) => x.id === id && (x.owner_id === user || x.talent_id === user));
    return o ? hydrateOrder(s, o) : null;
  },
  async payOrder(id) {
    const s = await load();
    const user = await me();
    const o = getOrderOrThrow(s, id);
    if (o.owner_id !== user) throw new Error('Bu ödemeyi yalnızca görev veren yapabilir.');
    if (o.status !== 'awaiting_payment') throw new Error('Bu iş için ödeme zaten yapıldı.');
    o.status = 'funded';
    o.payment_ref = uid('demo-pay-');
    s.messages.push({
      id: uid('m-'),
      order_id: o.id,
      sender_id: 'system',
      body: 'Ödeme güvende. Kayıt teslim edilip onaylanınca seslendirmene aktarılacak.',
      created_at: nowIso(),
    });
    await save();
    return { funded: true };
  },
  async deliverOrder(id, media, note) {
    const s = await load();
    const user = await me();
    const o = getOrderOrThrow(s, id);
    if (o.talent_id !== user) throw new Error('Teslimi yalnızca seçilen yetenek yapabilir.');
    if (!['funded', 'revision'].includes(o.status)) throw new Error('Bu iş şu an teslim alınmıyor.');
    if (note && findContactInfo(note)) throw new Error(CONTACT_WARNING);
    o.delivery_path = await persistMedia(media);
    o.delivery_note = note;
    o.status = 'delivered';
    o.delivered_at = nowIso();
    const role = s.roles.find((r) => r.id === o.role_id);
    if (role) role.status = 'delivered';
    await save();
  },
  async requestRevision(id, note) {
    const s = await load();
    const user = await me();
    const o = getOrderOrThrow(s, id);
    if (o.owner_id !== user) throw new Error('Revizyonu yalnızca görev veren isteyebilir.');
    if (o.status !== 'delivered') throw new Error('Önce teslim yapılmalı.');
    if (o.revision_count >= MAX_REVISIONS) throw new Error(`En fazla ${MAX_REVISIONS} revizyon istenebilir.`);
    if (note && findContactInfo(note)) throw new Error(CONTACT_WARNING);
    o.status = 'revision';
    o.revision_count += 1;
    const role = s.roles.find((r) => r.id === o.role_id);
    if (role) role.status = 'cast';
    s.messages.push({ id: uid('m-'), order_id: o.id, sender_id: user, body: `Revizyon isteği: ${note}`, created_at: nowIso() });
    await save();
  },
  async approveOrder(id) {
    const s = await load();
    const user = await me();
    const o = getOrderOrThrow(s, id);
    if (o.owner_id !== user) throw new Error('Onayı yalnızca görev veren verebilir.');
    if (o.status !== 'delivered') throw new Error('Onaylanacak bir teslim yok.');
    o.status = 'approved';
    o.approved_at = nowIso();
    const role = s.roles.find((r) => r.id === o.role_id);
    if (role) role.status = 'approved';
    const talent = s.profiles.find((p) => p.id === o.talent_id);
    if (talent) talent.completed_count += 1;
    updateTaskStatus(s, o.task_id);
    s.messages.push({
      id: uid('m-'),
      order_id: o.id,
      sender_id: 'system',
      body: 'İş onaylandı. Ödeme seslendirmenin hesabına aktarıldı.',
      created_at: nowIso(),
    });
    await save();
  },

  async listMessages(orderId) {
    const s = await load();
    const user = await me();
    const o = s.orders.find((x) => x.id === orderId);
    if (!o || (o.owner_id !== user && o.talent_id !== user)) return [];
    return s.messages.filter((m) => m.order_id === orderId).sort((a, b) => a.created_at.localeCompare(b.created_at));
  },
  async sendMessage(orderId, body) {
    const s = await load();
    const user = await me();
    const o = getOrderOrThrow(s, orderId);
    if (o.owner_id !== user && o.talent_id !== user) throw new Error('Bu işe mesaj gönderemezsiniz.');
    if (findContactInfo(body)) throw new Error(CONTACT_WARNING);
    s.messages.push({ id: uid('m-'), order_id: orderId, sender_id: user, body: body.trim(), created_at: nowIso() });
    await save();
  },
  async addReview(orderId, stars, comment) {
    const s = await load();
    const user = await me();
    const o = getOrderOrThrow(s, orderId);
    if (o.status !== 'approved') throw new Error('Puan, iş onaylandıktan sonra verilir.');
    if (s.reviews.some((r) => r.order_id === orderId && r.from_id === user)) throw new Error('Bu işi zaten puanladınız.');
    const to = o.owner_id === user ? o.talent_id : o.owner_id;
    s.reviews.push({ id: uid('rv-'), order_id: orderId, from_id: user, to_id: to, stars, comment, created_at: nowIso() });
    const p = s.profiles.find((x) => x.id === to);
    if (p) {
      p.rating_avg = Math.round(((p.rating_avg * p.rating_count + stars) / (p.rating_count + 1)) * 10) / 10;
      p.rating_count += 1;
    }
    await save();
  },
  async hasReviewed(orderId) {
    const s = await load();
    const user = await me();
    return s.reviews.some((r) => r.order_id === orderId && r.from_id === user);
  },

  async mediaUrl(path) {
    return path;
  },
  async report() {
    // Demo: şikâyet yalnızca kabul edilir.
  },
};

export async function resetDemo() {
  state = seed();
  await save();
  listeners.forEach((l) => l(null));
}
