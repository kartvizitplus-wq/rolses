import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { api } from '../../src/data';
import { useAuth } from '../../src/lib/auth';
import { useLoader } from '../../src/lib/useAsync';
import { AudioPlayer, Recorder } from '../../src/components/audio';
import { Button, Card, Empty, ErrorBox, Field, Loading, Row, Screen, SectionTitle, StatusPill } from '../../src/components/ui';
import { colors, font, radius, space } from '../../src/theme';
import { AUTO_APPROVE_HOURS, MAX_REVISIONS, formatTL } from '../../src/lib/pricing';
import { confirm, errorText, notify } from '../../src/lib/notify';
import { timeAgo } from '../../src/lib/id';
import type { LocalMedia, Order } from '../../src/types';

const STEPS: { key: Order['status'][]; label: string }[] = [
  { key: ['awaiting_payment'], label: 'Seçildi' },
  { key: ['funded', 'revision'], label: 'Ödeme güvende' },
  { key: ['delivered'], label: 'Teslim' },
  { key: ['approved'], label: 'Onay' },
];

function stepIndex(status: Order['status']) {
  return Math.max(0, STEPS.findIndex((s) => s.key.includes(status)));
}

export default function OrderScreen() {
  const { id, payment } = useLocalSearchParams<{ id: string; payment?: string }>();
  const { userId } = useAuth();
  const { data: order, loading, error, reload } = useLoader(() => api.getOrder(String(id)), [id, userId]);
  const [busy, setBusy] = useState(false);
  const [media, setMedia] = useState<LocalMedia | null>(null);
  const [note, setNote] = useState('');
  const [revisionNote, setRevisionNote] = useState('');

  if (!userId) return <Screen><Empty icon="lock-closed-outline" title="Giriş yapın" action={<Button title="Giriş yap" onPress={() => router.push('/login')} />} /></Screen>;
  if (loading && !order) return <Loading />;
  if (error) return <Screen><ErrorBox text={error} /></Screen>;
  if (!order) return <Screen><Empty icon="help-circle-outline" title="İş bulunamadı" /></Screen>;

  const isOwner = order.owner_id === userId;
  const current = stepIndex(order.status);
  const talentNet = Number(order.amount) - Number(order.talent_commission);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
      await reload();
    } catch (e) {
      notify('İşlem tamamlanamadı', errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const pay = () =>
    run(async () => {
      const res = await api.payOrder(order.id);
      if (res.paymentPageUrl) {
        if (Platform.OS === 'web') {
          window.location.href = res.paymentPageUrl;
        } else {
          await WebBrowser.openBrowserAsync(res.paymentPageUrl);
        }
      } else if (res.funded) {
        notify('Ödeme güvende', 'Seslendirmen kaydı yapıp teslim edecek.');
      }
    });

  const deliver = () =>
    run(async () => {
      if (!media) throw new Error('Önce kaydı yapın ya da dosyayı yükleyin.');
      await api.deliverOrder(order.id, media, note.trim());
      setMedia(null);
      setNote('');
      notify('Teslim edildi', `Görev veren ${AUTO_APPROVE_HOURS} saat içinde onaylamazsa iş otomatik onaylanır.`);
    });

  const approve = async () => {
    if (!(await confirm('Teslimi onayla', `${formatTL(talentNet)} seslendirmene aktarılacak. Bu işlem geri alınamaz.`, 'Onayla'))) return;
    run(() => api.approveOrder(order.id));
  };

  const revise = () =>
    run(async () => {
      if (!revisionNote.trim()) throw new Error('Neyin değişmesini istediğinizi yazın.');
      await api.requestRevision(order.id, revisionNote.trim());
      setRevisionNote('');
    });

  return (
    <Screen>
      {payment === 'ok' ? <Banner ok text="Ödemeniz alındı ve güvende." /> : null}
      {payment === 'fail' ? <Banner text="Ödeme tamamlanamadı. Tekrar deneyebilirsiniz." /> : null}

      <Text style={font.label}>{order.task?.title}</Text>
      <Row style={{ justifyContent: 'space-between', marginTop: space(1) }}>
        <Text style={font.h2}>{order.role?.name}</Text>
        <StatusPill status={order.status} />
      </Row>
      <Text style={[font.small, { marginTop: space(1) }]}>
        {isOwner ? `Seslendirmen: ${order.talent?.display_name ?? ''}` : `Görev veren: ${order.owner?.display_name ?? ''}`}
      </Text>

      <View style={styles.steps}>
        {STEPS.map((s, i) => (
          <View key={s.label} style={styles.step}>
            <View style={[styles.dot, i <= current && styles.dotOn]}>
              {i < current || order.status === 'approved' ? <Ionicons name="checkmark" size={12} color={colors.white} /> : null}
            </View>
            <Text style={[styles.stepText, i <= current && { color: colors.ink }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={font.body}>Rol bütçesi</Text>
          <Text style={font.body}>{formatTL(Number(order.amount))}</Text>
        </Row>
        {isOwner ? (
          <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={font.small}>Güvenli ödeme hizmet bedeli</Text>
            <Text style={font.small}>{formatTL(Number(order.owner_fee))}</Text>
          </Row>
        ) : (
          <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={font.small}>Platform komisyonu (%15)</Text>
            <Text style={font.small}>−{formatTL(Number(order.talent_commission))}</Text>
          </Row>
        )}
        <View style={{ height: 1, backgroundColor: colors.line, marginVertical: space(3) }} />
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={font.h3}>{isOwner ? 'Ödenecek' : 'Eline geçecek'}</Text>
          <Text style={[font.h3, { color: colors.onAir }]}>
            {formatTL(isOwner ? Number(order.amount) + Number(order.owner_fee) : talentNet)}
          </Text>
        </Row>
      </Card>

      <Card style={{ backgroundColor: colors.bg }}>
        <Text style={[font.label, { marginBottom: space(2) }]}>Replikler</Text>
        {(order.role?.lines ?? []).map((l, i) => (
          <Text key={i} style={[font.body, { marginBottom: 6 }]}>
            “{l.text}” {l.emotion ? <Text style={font.small}>({l.emotion})</Text> : null}
          </Text>
        ))}
      </Card>

      {/* --- Adıma göre eylemler --- */}
      {order.status === 'awaiting_payment' &&
        (isOwner ? (
          <Card>
            <Text style={font.h3}>Ödemeyi güvenli hesaba alın</Text>
            <Text style={[font.small, { marginVertical: space(2) }]}>
              Para seslendirmene hemen geçmez. Teslimi dinleyip onayladığınızda aktarılır; teslim gelmezse iade edilir.
            </Text>
            <Button title={`${formatTL(Number(order.amount) + Number(order.owner_fee))} öde`} icon="lock-closed" onPress={pay} loading={busy} />
            {api.mode === 'demo' ? <Text style={[font.small, { marginTop: space(2) }]}>Demo: gerçek ödeme alınmaz.</Text> : null}
          </Card>
        ) : (
          <Card>
            <Text style={font.h3}>Tebrikler, seçildin!</Text>
            <Text style={[font.small, { marginTop: space(2) }]}>
              Görev veren ödemeyi güvenli hesaba aldığında kayda başlayabilirsin. Ödeme gelmeden kayıt yapma.
            </Text>
          </Card>
        ))}

      {(order.status === 'funded' || order.status === 'revision') &&
        (isOwner ? (
          <Card>
            <Text style={font.h3}>Kayıt bekleniyor</Text>
            <Text style={[font.small, { marginTop: space(2) }]}>Ödemeniz güvende. Seslendirmen teslim edince burada dinleyebileceksiniz.</Text>
          </Card>
        ) : (
          <Card>
            <Text style={[font.h3, { marginBottom: space(1) }]}>{order.status === 'revision' ? 'Revizyonu teslim et' : 'Kaydı teslim et'}</Text>
            <Text style={[font.small, { marginBottom: space(3) }]}>
              Tüm replikleri tek dosyada ya da sırasıyla okuyun. Sessiz bir ortam ve temiz kayıt onayı hızlandırır.
            </Text>
            <Recorder value={media} onChange={setMedia} allowVideo={order.task?.type === 'script'} />
            <View style={{ height: space(3) }} />
            <Field label="Teslim notu (isteğe bağlı)" value={note} onChangeText={setNote} multiline placeholder="Ör. 2. replikte iki farklı ton var" />
            <Button title="Teslim et" icon="cloud-upload" onPress={deliver} loading={busy} disabled={!media} />
          </Card>
        ))}

      {order.delivery_path && order.status !== 'revision' ? (
        <Card>
          <Text style={[font.h3, { marginBottom: space(2) }]}>Teslim edilen kayıt</Text>
          <AudioPlayer path={order.delivery_path} label={order.delivered_at ? `Teslim: ${timeAgo(order.delivered_at)}` : undefined} />
          {order.delivery_note ? <Text style={[font.body, { marginTop: space(2) }]}>{order.delivery_note}</Text> : null}
        </Card>
      ) : null}

      {order.status === 'delivered' &&
        (isOwner ? (
          <Card>
            <Text style={font.h3}>Kaydı dinlediniz mi?</Text>
            <Text style={[font.small, { marginVertical: space(2) }]}>
              Onaylarsanız ödeme aktarılır. {MAX_REVISIONS - order.revision_count} revizyon hakkınız kaldı. {AUTO_APPROVE_HOURS} saat içinde
              yanıt verilmezse otomatik onaylanır.
            </Text>
            <Button title="Onayla ve ödemeyi aktar" icon="checkmark-circle" onPress={approve} loading={busy} />
            {order.revision_count < MAX_REVISIONS ? (
              <View style={{ marginTop: space(4) }}>
                <Field label="Revizyon isteği" value={revisionNote} onChangeText={setRevisionNote} multiline placeholder="Ör. 1. replik daha kızgın olsun" />
                <Button title="Revizyon iste" kind="ghost" icon="refresh" onPress={revise} loading={busy} />
              </View>
            ) : null}
          </Card>
        ) : (
          <Card>
            <Text style={font.h3}>Onay bekleniyor</Text>
            <Text style={[font.small, { marginTop: space(2) }]}>
              Görev veren onaylayınca {formatTL(talentNet)} hesabına geçer. {AUTO_APPROVE_HOURS} saat içinde yanıt gelmezse otomatik onaylanır.
            </Text>
          </Card>
        ))}

      {order.status === 'approved' ? <ReviewBox orderId={order.id} otherName={isOwner ? order.talent?.display_name : order.owner?.display_name} /> : null}

      <Thread orderId={order.id} />
    </Screen>
  );
}

function Banner({ text, ok }: { text: string; ok?: boolean }) {
  return (
    <View style={[styles.banner, { backgroundColor: ok ? colors.greenSoft : colors.onAirSoft }]}>
      <Ionicons name={ok ? 'checkmark-circle' : 'alert-circle'} size={18} color={ok ? colors.green : colors.onAir} />
      <Text style={[font.small, { color: ok ? colors.green : colors.onAir, flex: 1 }]}>{text}</Text>
    </View>
  );
}

function ReviewBox({ orderId, otherName }: { orderId: string; otherName?: string }) {
  const { data: done, reload } = useLoader(() => api.hasReviewed(orderId), [orderId]);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  if (done === null) return null;
  if (done) {
    return (
      <Card>
        <Text style={font.h3}>Puanınız kaydedildi. Teşekkürler!</Text>
      </Card>
    );
  }
  return (
    <Card>
      <Text style={font.h3}>{otherName ?? 'Karşı tarafı'} puanlayın</Text>
      <Row style={{ marginVertical: space(3) }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => setStars(n)} accessibilityLabel={`${n} yıldız`}>
            <Ionicons name={n <= stars ? 'star' : 'star-outline'} size={32} color={colors.amber} />
          </Pressable>
        ))}
      </Row>
      <Field label="Yorum" value={comment} onChangeText={setComment} multiline placeholder="Nasıl bir deneyimdi?" />
      <Button
        title="Puanı gönder"
        loading={busy}
        onPress={async () => {
          setBusy(true);
          try {
            await api.addReview(orderId, stars, comment.trim());
            reload();
          } catch (e) {
            notify('Gönderilemedi', errorText(e));
          } finally {
            setBusy(false);
          }
        }}
      />
    </Card>
  );
}

function Thread({ orderId }: { orderId: string }) {
  const { userId } = useAuth();
  const { data: messages, reload } = useLoader(() => api.listMessages(orderId), [orderId]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  async function send() {
    if (!text.trim()) return;
    setSending(true);
    try {
      await api.sendMessage(orderId, text);
      setText('');
      reload();
    } catch (e) {
      notify('Mesaj gönderilemedi', errorText(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <SectionTitle>Mesajlar</SectionTitle>
      {(messages ?? []).map((m) => {
        const system = m.sender_id === 'system';
        const mine = m.sender_id === userId;
        return (
          <View
            key={m.id}
            style={[styles.msg, system ? styles.msgSystem : mine ? styles.msgMine : styles.msgOther]}
          >
            <Text style={[font.body, mine && !system && { color: colors.white }]}>{m.body}</Text>
            <Text style={[font.small, { fontSize: 11, marginTop: 2 }, mine && !system && { color: '#E8E4F0' }]}>{timeAgo(m.created_at)}</Text>
          </View>
        );
      })}
      <Row style={{ marginTop: space(2), alignItems: 'flex-end' }}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Mesaj yaz"
          placeholderTextColor="#A39C8E"
          multiline
          style={styles.msgInput}
        />
        <Button title="Gönder" small onPress={send} loading={sending} />
      </Row>
      <Text style={[font.small, { marginTop: space(2) }]}>
        Telefon, e-posta ve IBAN paylaşımı engellenir. Platform dışında ödeme yapanlar güvenli ödeme korumasını kaybeder.
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  steps: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: space(5) },
  step: { alignItems: 'center', flex: 1, gap: 6 },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotOn: { backgroundColor: colors.onAir },
  stepText: { fontSize: 12, fontWeight: '700', color: colors.inkSoft },
  banner: { flexDirection: 'row', gap: space(2), alignItems: 'center', padding: space(3), borderRadius: radius.m, marginBottom: space(3) },
  msg: { padding: space(3), borderRadius: radius.m, marginBottom: space(2), maxWidth: '85%' },
  msgMine: { backgroundColor: colors.ink, alignSelf: 'flex-end' },
  msgOther: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignSelf: 'flex-start' },
  msgSystem: { backgroundColor: colors.amberSoft, alignSelf: 'center', maxWidth: '100%' },
  msgInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.m,
    paddingHorizontal: space(3),
    paddingVertical: space(2.5),
    fontSize: 15,
    color: colors.ink,
  },
});
