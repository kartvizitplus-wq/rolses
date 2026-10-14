-- RolSes veritabanı şeması (Supabase / PostgreSQL)
-- Supabase > SQL Editor'a yapıştırıp bir kez çalıştırın.

create extension if not exists pgcrypto;

-- ============ TABLOLAR ============

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Yeni kullanıcı',
  bio text not null default '',
  city text not null default '',
  gender text not null default '' check (gender in ('', 'kadın', 'erkek')),
  voice_tags text[] not null default '{}',
  demo_path text,
  is_talent boolean not null default false,
  rating_avg numeric(2,1) not null default 0,
  rating_count int not null default 0,
  completed_count int not null default 0,
  -- iyzico alt üye işyeri anahtarı (IBAN vb. bizde saklanmaz, iyzico'da durur)
  submerchant_key text,
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('voice', 'script')),
  title text not null check (char_length(title) between 5 and 120),
  description text not null default '',
  video_url text not null default '',
  language text not null default 'Türkçe',
  deadline date,
  mature boolean not null default false,
  status text not null default 'open' check (status in ('open', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);
create index on public.tasks (status, created_at desc);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  name text not null,
  description text not null default '',
  gender_pref text not null default '' check (gender_pref in ('', 'kadın', 'erkek')),
  budget numeric(10,2) not null check (budget >= 50),
  lines jsonb not null default '[]',
  status text not null default 'open' check (status in ('open', 'cast', 'delivered', 'approved')),
  talent_id uuid references public.profiles(id),
  application_count int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.roles (task_id);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.roles(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  talent_id uuid not null references public.profiles(id) on delete cascade,
  media_path text,
  media_kind text not null default 'audio' check (media_kind in ('audio', 'video', 'link')),
  link text not null default '',
  note text not null default '',
  status text not null default 'pending' check (status in ('pending', 'shortlisted', 'selected', 'rejected')),
  created_at timestamptz not null default now(),
  unique (role_id, talent_id)
);
create index on public.applications (task_id);
create index on public.applications (talent_id);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null unique references public.roles(id) on delete restrict,
  task_id uuid not null references public.tasks(id) on delete restrict,
  owner_id uuid not null references public.profiles(id),
  talent_id uuid not null references public.profiles(id),
  amount numeric(10,2) not null,
  owner_fee numeric(10,2) not null,
  talent_commission numeric(10,2) not null,
  status text not null default 'awaiting_payment'
    check (status in ('awaiting_payment', 'funded', 'delivered', 'revision', 'approved', 'cancelled')),
  payment_ref text,          -- iyzico paymentId
  payment_item_ref text,     -- iyzico paymentTransactionId (onayla serbest bırakmak için)
  delivery_path text,
  delivery_note text not null default '',
  revision_count int not null default 0,
  delivered_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.orders (owner_id);
create index on public.orders (talent_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  sender_id uuid references public.profiles(id), -- null = sistem mesajı
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index on public.messages (order_id, created_at);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  from_id uuid not null references public.profiles(id),
  to_id uuid not null references public.profiles(id),
  stars int not null check (stars between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  unique (order_id, from_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id),
  target_type text not null check (target_type in ('task', 'user', 'application')),
  target_id text not null,
  reason text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============ YARDIMCI FONKSİYONLAR ============

-- Yeni kullanıcı kaydolunca profil oluştur (Google adını kullanır).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name',
             new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1), 'Yeni kullanıcı')
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- İletişim bilgisi (telefon, IBAN, e-posta) içeren mesajları engelle.
create or replace function public.contains_contact(t text)
returns boolean language sql immutable as $$
  select t ~* 'TR\s?\d{2}(\s?\d{4}){5}\s?\d{2}'
      or t ~ '(\+?90[\s-]?)?\(?0?5\d{2}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}'
      or t ~* '[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}'
      or t ~* '\m(whats?app|telegram)\M'
$$;

create or replace function public.block_contact_messages()
returns trigger language plpgsql as $$
begin
  if new.sender_id is not null and public.contains_contact(new.body) then
    raise exception 'Güvenliğiniz için iletişim ve ödeme bilgisi paylaşılamaz.';
  end if;
  return new;
end $$;

create trigger messages_block_contact before insert on public.messages
  for each row execute function public.block_contact_messages();

-- Görev durumunu rollerden türet.
create or replace function public.refresh_task_status(p_task uuid)
returns void language plpgsql security definer set search_path = public as $$
declare total int; approved int; busy int;
begin
  select count(*), count(*) filter (where status = 'approved'), count(*) filter (where status <> 'open')
    into total, approved, busy from roles where task_id = p_task;
  update tasks set status = case
      when status = 'cancelled' then 'cancelled'
      when total > 0 and approved = total then 'completed'
      when busy > 0 then 'in_progress'
      else 'open' end
  where id = p_task;
end $$;

-- ============ İŞ AKIŞI (sunucuda doğrulanan adımlar) ============

-- Görev veren bir başvuruyu seçer: rol kapanır, ödeme bekleyen iş açılır.
create or replace function public.select_application(p_application uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare a applications; r roles; t tasks; o_id uuid;
begin
  select * into a from applications where id = p_application for update;
  if not found then raise exception 'Başvuru bulunamadı.'; end if;
  select * into t from tasks where id = a.task_id;
  if t.owner_id <> auth.uid() then raise exception 'Yetkiniz yok.'; end if;
  select * into r from roles where id = a.role_id for update;
  if r.status <> 'open' then raise exception 'Bu rol için zaten seçim yapıldı.'; end if;

  update applications set status = 'selected' where id = a.id;
  update applications set status = 'rejected'
    where role_id = r.id and id <> a.id and status <> 'rejected';
  update roles set status = 'cast', talent_id = a.talent_id where id = r.id;

  insert into orders (role_id, task_id, owner_id, talent_id, amount, owner_fee, talent_commission)
  values (r.id, t.id, t.owner_id, a.talent_id, r.budget,
          round(r.budget * 0.05, 2), round(r.budget * 0.15, 2))
  returning id into o_id;

  perform refresh_task_status(t.id);
  return o_id;
end $$;

-- Yetenek teslim eder (yalnızca ödeme güvendeyken).
create or replace function public.deliver_order(p_order uuid, p_path text, p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare o orders;
begin
  select * into o from orders where id = p_order for update;
  if not found or o.talent_id <> auth.uid() then raise exception 'Yetkiniz yok.'; end if;
  if o.status not in ('funded', 'revision') then raise exception 'Bu iş şu an teslim alınmıyor.'; end if;
  if public.contains_contact(coalesce(p_note, '')) then raise exception 'Notta iletişim bilgisi paylaşılamaz.'; end if;
  update orders set status = 'delivered', delivery_path = p_path, delivery_note = coalesce(p_note, ''),
    delivered_at = now() where id = o.id;
  update roles set status = 'delivered' where id = o.role_id;
end $$;

-- Görev veren revizyon ister (en fazla 2).
create or replace function public.request_revision(p_order uuid, p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare o orders;
begin
  select * into o from orders where id = p_order for update;
  if not found or o.owner_id <> auth.uid() then raise exception 'Yetkiniz yok.'; end if;
  if o.status <> 'delivered' then raise exception 'Önce teslim yapılmalı.'; end if;
  if o.revision_count >= 2 then raise exception 'En fazla 2 revizyon istenebilir.'; end if;
  update orders set status = 'revision', revision_count = revision_count + 1 where id = o.id;
  update roles set status = 'cast' where id = o.role_id;
  insert into messages (order_id, sender_id, body) values (o.id, auth.uid(), 'Revizyon isteği: ' || coalesce(p_note, ''));
end $$;

-- Onay ve ödeme bloke/serbest bırakma YALNIZCA sunucu fonksiyonu (Edge Function, service role) ile yapılır.
create or replace function public.mark_order_funded(p_order uuid, p_payment_ref text, p_item_ref text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update orders set status = 'funded', payment_ref = p_payment_ref, payment_item_ref = p_item_ref
    where id = p_order and status = 'awaiting_payment';
  if found then
    insert into messages (order_id, sender_id, body)
      values (p_order, null, 'Ödeme güvende. Kayıt teslim edilip onaylanınca seslendirmene aktarılacak.');
  end if;
end $$;

create or replace function public.mark_order_approved(p_order uuid)
returns void language plpgsql security definer set search_path = public as $$
declare o orders;
begin
  select * into o from orders where id = p_order for update;
  if o.status <> 'delivered' then raise exception 'Onaylanacak teslim yok.'; end if;
  update orders set status = 'approved', approved_at = now() where id = o.id;
  update roles set status = 'approved' where id = o.role_id;
  update profiles set completed_count = completed_count + 1 where id = o.talent_id;
  insert into messages (order_id, sender_id, body)
    values (o.id, null, 'İş onaylandı. Ödeme seslendirmenin hesabına aktarıldı.');
  perform refresh_task_status(o.task_id);
end $$;

revoke execute on function public.mark_order_funded(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.mark_order_approved(uuid) from public, anon, authenticated;

-- Puan verildiğinde profil ortalamasını güncelle.
create or replace function public.apply_review()
returns trigger language plpgsql security definer set search_path = public as $$
declare o orders;
begin
  select * into o from orders where id = new.order_id;
  if o.status <> 'approved' then raise exception 'Puan, iş onaylandıktan sonra verilir.'; end if;
  if new.from_id not in (o.owner_id, o.talent_id) then raise exception 'Yetkiniz yok.'; end if;
  new.to_id := case when new.from_id = o.owner_id then o.talent_id else o.owner_id end;
  update profiles set
    rating_avg = round(((rating_avg * rating_count) + new.stars) / (rating_count + 1), 1),
    rating_count = rating_count + 1
  where id = new.to_id;
  return new;
end $$;

create trigger reviews_apply before insert on public.reviews
  for each row execute function public.apply_review();

-- Başvuru yapan kişiyi yetenek olarak işaretle.
create or replace function public.mark_talent()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update profiles set is_talent = true where id = new.talent_id and not is_talent;
  update roles set application_count = application_count + 1 where id = new.role_id;
  return new;
end $$;
create trigger applications_mark_talent after insert on public.applications
  for each row execute function public.mark_talent();

-- ============ GÜVENLİK (RLS) ============

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.roles enable row level security;
alter table public.applications enable row level security;
alter table public.orders enable row level security;
alter table public.messages enable row level security;
alter table public.reviews enable row level security;
alter table public.reports enable row level security;

-- Profiller herkese açık; herkes yalnızca kendi profilini düzenler.
create policy "profiles read" on public.profiles for select using (true);
create policy "profiles update own" on public.profiles for update using (id = auth.uid())
  with check (id = auth.uid());

-- Profil puanları ve sayaçlar kullanıcı tarafından değiştirilemesin.
create or replace function public.protect_profile_stats()
returns trigger language plpgsql as $$
begin
  -- Uygulamadan gelen doğrudan güncellemeler 'authenticated' rolüyle çalışır;
  -- sunucu fonksiyonları (security definer) bu kısıta takılmaz.
  if current_user = 'authenticated' then
    new.rating_avg := old.rating_avg;
    new.rating_count := old.rating_count;
    new.completed_count := old.completed_count;
    new.submerchant_key := old.submerchant_key;
  end if;
  return new;
end $$;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_stats();

-- Görevler herkese açık; sahibi oluşturur/düzenler.
create policy "tasks read" on public.tasks for select using (true);
create policy "tasks insert own" on public.tasks for insert with check (owner_id = auth.uid());
create policy "tasks update own" on public.tasks for update using (owner_id = auth.uid());

create policy "roles read" on public.roles for select using (true);
create policy "roles insert by owner" on public.roles for insert
  with check (exists (select 1 from tasks t where t.id = task_id and t.owner_id = auth.uid())
              and status = 'open' and talent_id is null and application_count = 0);

-- Başvurular: yetenek kendi başvurusunu, görev sahibi kendi görevine gelenleri görür.
create policy "applications read" on public.applications for select using (
  talent_id = auth.uid()
  or exists (select 1 from tasks t where t.id = task_id and t.owner_id = auth.uid())
);
create policy "applications insert" on public.applications for insert with check (
  talent_id = auth.uid()
  and status = 'pending'
  and exists (select 1 from roles r join tasks t on t.id = r.task_id
              where r.id = role_id and r.task_id = task_id and r.status = 'open'
                and t.owner_id <> auth.uid() and t.status in ('open', 'in_progress'))
);
create policy "applications owner shortlist" on public.applications for update using (
  exists (select 1 from tasks t where t.id = task_id and t.owner_id = auth.uid())
) with check (status in ('pending', 'shortlisted', 'rejected'));

-- İşler: yalnızca iki taraf görür; değişiklikler fonksiyonlarla yapılır.
create policy "orders read" on public.orders for select
  using (owner_id = auth.uid() or talent_id = auth.uid());

create policy "messages read" on public.messages for select using (
  exists (select 1 from orders o where o.id = order_id and auth.uid() in (o.owner_id, o.talent_id))
);
create policy "messages insert" on public.messages for insert with check (
  sender_id = auth.uid()
  and exists (select 1 from orders o where o.id = order_id and auth.uid() in (o.owner_id, o.talent_id))
);

create policy "reviews read" on public.reviews for select using (true);
create policy "reviews insert" on public.reviews for insert with check (from_id = auth.uid());

create policy "reports insert" on public.reports for insert with check (reporter_id = auth.uid());

-- ============ DOSYA DEPOLAMA ============
-- media: başvuru, teslim ve demo sesleri. Dosya yolu: <kullanıcı-id>/<dosya>
insert into storage.buckets (id, name, public) values ('media', 'media', false)
  on conflict (id) do nothing;

create policy "media upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

-- Okuma: dosyanın sahibi; başvuru/teslim dosyası için ilgili görev sahibi; demo sesleri herkes.
create policy "media read" on storage.objects for select to authenticated using (
  bucket_id = 'media' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from profiles p where p.demo_path = name)
    or exists (select 1 from applications a join tasks t on t.id = a.task_id
               where a.media_path = name and t.owner_id = auth.uid())
    or exists (select 1 from orders o where o.delivery_path = name and o.owner_id = auth.uid())
  )
);
