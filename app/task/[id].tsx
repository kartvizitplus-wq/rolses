import React, { useMemo, useState } from 'react';
import { Linking, Platform, Pressable, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { api } from '../../src/data';
import { useAuth } from '../../src/lib/auth';
import { useLoader } from '../../src/lib/useAsync';
import { RoleCard } from '../../src/components/cards';
import { AudioPlayer } from '../../src/components/audio';
import { Button, Card, Empty, ErrorBox, Loading, Pill, Row, Screen, SectionTitle, Stars, StatusPill } from '../../src/components/ui';
import { colors, font, space } from '../../src/theme';
import { formatDate, timeAgo } from '../../src/lib/id';
import { confirm, errorText, notify } from '../../src/lib/notify';
import { formatTL, priceBreakdown } from '../../src/lib/pricing';
import type { Application, Role, Task } from '../../src/types';

function isDirectVideo(url: string) {
  return /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url);
}

function InlineVideo({ url }: { url: string }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
  });
  return (
    <VideoView
      player={player}
      nativeControls
      contentFit="contain"
      style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000', borderRadius: 14 }}
    />
  );
}

export default function TaskDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useAuth();
  const { data: task, loading, error, reload } = useLoader(() => api.getTask(String(id)), [id]);
  const isOwner = Boolean(task && userId && task.owner_id === userId);

  if (loading && !task) return <Loading />;
  if (error) return <Screen><ErrorBox text={error} /></Screen>;
  if (!task) return <Screen><Empty icon="help-circle-outline" title="Görev bulunamadı" /></Screen>;

  return (
    <Screen>
      <Stack.Screen options={{ title: task.type === 'script' ? 'Senaryo görevi' : 'Seslendirme görevi' }} />
      <Row style={{ flexWrap: 'wrap', marginBottom: space(2) }}>
        <StatusPill status={task.status} />
        {task.mature ? <Pill text="+18 dil" /> : null}
        <Text style={font.small}>{timeAgo(task.created_at)}</Text>
      </Row>
      <Text style={font.h2}>{task.title}</Text>
      <Pressable onPress={() => task.owner && router.push(`/talent/${task.owner.id}`)}>
        <Row style={{ marginTop: space(2) }}>
          <Text style={font.small}>Görev veren: {task.owner?.display_name ?? '—'}</Text>
          <Stars value={task.owner?.rating_avg ?? 0} count={task.owner?.rating_count} />
        </Row>
      </Pressable>
      {task.description ? <Text style={[font.body, { marginTop: space(3) }]}>{task.description}</Text> : null}
      {task.deadline ? <Text style={[font.small, { marginTop: space(2) }]}>Son teslim: {formatDate(task.deadline)}</Text> : null}

      {task.video_url ? (
        <View style={{ marginTop: space(4) }}>
          {isDirectVideo(task.video_url) ? (
            <InlineVideo url={task.video_url} />
          ) : (
            <Button
              title="Videoyu izle"
              icon="play-circle-outline"
              kind="secondary"
              onPress={() => Linking.openURL(task.video_url)}
            />
          )}
        </View>
      ) : null}

      {isOwner ? <OwnerView task={task} onChange={reload} /> : <TalentView task={task} />}

      {!isOwner && userId ? (
        <Pressable
          style={{ marginTop: space(6), alignSelf: 'center' }}
          onPress={async () => {
            if (await confirm('Görevi bildir', 'Bu görev kurallara aykırı mı? Ekibimiz inceleyecek.', 'Bildir')) {
              await api.report('task', task.id, 'Kullanıcı bildirimi');
              notify('Teşekkürler', 'Bildiriminiz alındı.');
            }
          }}
        >
          <Text style={font.small}>Bu görevi bildir</Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}

function TalentView({ task }: { task: Task }) {
  const { userId } = useAuth();
  const { data: mine } = useLoader(
    () => (userId ? api.listMyApplications() : Promise.resolve([])),
    [userId, task.id],
  );
  const applied = useMemo(() => new Set((mine ?? []).map((a) => a.role_id)), [mine]);

  return (
    <>
      <SectionTitle>Roller</SectionTitle>
      <Text style={[font.small, { marginBottom: space(3) }]}>
        {task.type === 'script'
          ? 'Oynamak istediğin role kısa bir deneme kaydıyla (ses ya da video) başvur.'
          : 'İstediğin karakterin bir iki repliğini kaydedip başvur. Seçilirsen ücret güvenli ödemeye alınır.'}
      </Text>
      {task.roles.map((r) => (
        <RoleCard
          key={r.id}
          role={r}
          canApply={task.status !== 'cancelled'}
          applied={applied.has(r.id)}
          onApply={() => (userId ? router.push(`/apply/${r.id}`) : router.push('/login'))}
        />
      ))}
    </>
  );
}

function OwnerView({ task, onChange }: { task: Task; onChange: () => void }) {
  const { data: apps, reload } = useLoader(() => api.listApplicationsForTask(task.id), [task.id]);
  const { data: orders, reload: reloadOrders } = useLoader(() => api.listMyOrders(), [task.id]);
  const [busy, setBusy] = useState<string | null>(null);

  const byRole = useMemo(() => {
    const m = new Map<string, Application[]>();
    for (const a of apps ?? []) m.set(a.role_id, [...(m.get(a.role_id) ?? []), a]);
    return m;
  }, [apps]);

  async function setStatus(a: Application, status: 'shortlisted' | 'rejected' | 'pending') {
    setBusy(a.id);
    try {
      await api.setApplicationStatus(a.id, status);
      reload();
    } catch (e) {
      notify('İşlem yapılamadı', errorText(e));
    } finally {
      setBusy(null);
    }
  }

  async function select(a: Application, role: Role) {
    const p = priceBreakdown(Number(role.budget));
    const ok = await confirm(
      `${a.talent?.display_name ?? 'Bu kişi'} seçilsin mi?`,
      `${role.name} rolü kapanır, diğer başvurular reddedilir. Sonraki adımda ${formatTL(p.ownerTotal)} güvenli ödemeye alınır.`,
      'Seç',
    );
    if (!ok) return;
    setBusy(a.id);
    try {
      const orderId = await api.selectApplication(a.id);
      onChange();
      reload();
      reloadOrders();
      router.push(`/order/${orderId}`);
    } catch (e) {
      notify('Seçim yapılamadı', errorText(e));
    } finally {
      setBusy(null);
    }
  }

  async function cancel() {
    if (!(await confirm('Görevi kapat', 'Görev yayından kalkar ve yeni başvuru alınmaz.', 'Kapat'))) return;
    try {
      await api.cancelTask(task.id);
      onChange();
    } catch (e) {
      notify('Kapatılamadı', errorText(e));
    }
  }

  return (
    <>
      <SectionTitle>Roller ve başvurular</SectionTitle>
      {task.roles.map((r) => {
        const list = byRole.get(r.id) ?? [];
        const order = (orders ?? []).find((o) => o.role_id === r.id);
        return (
          <RoleCard
            key={r.id}
            role={r}
            canApply={false}
            footer={
              <View style={{ marginTop: space(4), gap: space(3) }}>
                {order ? (
                  <Button
                    title={order.status === 'awaiting_payment' ? 'Ödemeyi yap ve işi başlat' : 'İşi aç'}
                    icon="arrow-forward"
                    kind={order.status === 'awaiting_payment' ? 'primary' : 'secondary'}
                    onPress={() => router.push(`/order/${order.id}`)}
                  />
                ) : null}
                {!list.length ? (
                  <Text style={font.small}>Henüz başvuru yok. Görevi paylaşarak daha fazla kişiye ulaşın.</Text>
                ) : null}
                {list
                  .filter((a) => a.status !== 'rejected' || r.status === 'open')
                  .map((a) => (
                    <Card key={a.id} style={{ backgroundColor: colors.bg, marginBottom: 0 }}>
                      <Row style={{ justifyContent: 'space-between', marginBottom: space(2) }}>
                        <Pressable onPress={() => router.push(`/talent/${a.talent_id}`)}>
                          <Text style={font.h3}>{a.talent?.display_name ?? 'Yetenek'}</Text>
                          <Stars value={a.talent?.rating_avg ?? 0} count={a.talent?.rating_count} />
                        </Pressable>
                        <StatusPill status={a.status} />
                      </Row>
                      {a.media_path && a.media_kind === 'audio' ? <AudioPlayer path={a.media_path} label="Deneme kaydı" /> : null}
                      {a.media_path && a.media_kind === 'video' ? (
                        <Button
                          title="Deneme videosunu aç"
                          icon="videocam-outline"
                          kind="ghost"
                          small
                          onPress={async () => Linking.openURL(await api.mediaUrl(a.media_path as string))}
                        />
                      ) : null}
                      {a.link ? (
                        <Pressable onPress={() => Linking.openURL(a.link)}>
                          <Text style={[font.small, { color: colors.blue }]}>{a.link}</Text>
                        </Pressable>
                      ) : null}
                      {a.note ? <Text style={[font.body, { marginTop: space(2) }]}>{a.note}</Text> : null}
                      {r.status === 'open' && a.status !== 'rejected' ? (
                        <Row style={{ marginTop: space(3), flexWrap: 'wrap' }}>
                          <Button title="Seç" icon="checkmark" small loading={busy === a.id} onPress={() => select(a, r)} />
                          {a.status === 'shortlisted' ? (
                            <Button title="Listeden çıkar" kind="ghost" small onPress={() => setStatus(a, 'pending')} />
                          ) : (
                            <Button title="Kısa liste" icon="bookmark-outline" kind="ghost" small onPress={() => setStatus(a, 'shortlisted')} />
                          )}
                          <Button title="Reddet" kind="danger" small onPress={() => setStatus(a, 'rejected')} />
                        </Row>
                      ) : null}
                    </Card>
                  ))}
              </View>
            }
          />
        );
      })}
      {task.status !== 'cancelled' && task.status !== 'completed' ? (
        <Button title="Görevi kapat" kind="danger" onPress={cancel} style={{ marginTop: space(4) }} />
      ) : null}
      {Platform.OS === 'web' ? (
        <Text style={[font.small, { marginTop: space(4) }]}>
          Paylaşım bağlantısı: {typeof window !== 'undefined' ? window.location.href : ''}
        </Text>
      ) : null}
    </>
  );
}
