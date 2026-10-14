import React, { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { api } from '../../src/data';
import { useAuth } from '../../src/lib/auth';
import { parseScript } from '../../src/lib/script';
import { MIN_ROLE_BUDGET, formatTL, priceBreakdown } from '../../src/lib/pricing';
import { notify, errorText } from '../../src/lib/notify';
import { Button, Card, Empty, Field, Row, Screen, SectionTitle, Segmented } from '../../src/components/ui';
import { colors, font, radius, space } from '../../src/theme';
import type { NewRoleInput, TaskType } from '../../src/types';

const EXAMPLE = `Ahmet: Ayşe bugün gelmiyormuş, neden? (kızgın) (bütçe: 50 TL)
Yusuf: Ne bileyim, ben Ayşe'nin bekçisi miyim? (alaycı) (50 TL)
Melike: Ben biliyorum. (gizemli) (50 TL)`;

function emptyRole(): NewRoleInput {
  return { name: '', description: '', gender_pref: '', budget: 100, lines: [{ text: '', emotion: '' }] };
}

function addDays(n: number) {
  return new Date(Date.now() + n * 86400_000).toISOString().slice(0, 10);
}

export default function CreateTask() {
  const { userId } = useAuth();
  const [type, setType] = useState<TaskType>('voice');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [days, setDays] = useState<number>(7);
  const [mature, setMature] = useState(false);
  const [script, setScript] = useState('');
  const [roles, setRoles] = useState<NewRoleInput[]>([]);
  const [saving, setSaving] = useState(false);

  if (!userId) {
    return (
      <Screen>
        <Empty
          icon="lock-closed-outline"
          title="Görev vermek için giriş yapın"
          text="Google hesabınızla saniyeler içinde giriş yapabilirsiniz."
          action={<Button title="Giriş yap" onPress={() => router.push('/login')} />}
        />
      </Screen>
    );
  }

  function importScript() {
    const parsed = parseScript(script);
    if (!parsed.length) {
      notify('Replik bulunamadı', 'Her satırı "Karakter: replik (duygu) (50 TL)" biçiminde yazın.');
      return;
    }
    setRoles(parsed);
  }

  function updateRole(i: number, patch: Partial<NewRoleInput>) {
    setRoles((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  function updateLine(ri: number, li: number, patch: Partial<{ text: string; emotion: string }>) {
    setRoles((rs) =>
      rs.map((r, j) => (j === ri ? { ...r, lines: r.lines.map((l, k) => (k === li ? { ...l, ...patch } : l)) } : r)),
    );
  }

  const total = roles.reduce((s, r) => s + (Number(r.budget) || 0), 0);
  const price = priceBreakdown(total);

  async function submit() {
    const cleanRoles = roles
      .map((r) => ({
        ...r,
        name: r.name.trim(),
        budget: Math.round(Number(r.budget) || 0),
        lines: r.lines.filter((l) => l.text.trim()).map((l) => ({ text: l.text.trim(), emotion: l.emotion.trim() })),
      }))
      .filter((r) => r.name);
    if (title.trim().length < 5) return notify('Başlık kısa', 'En az 5 karakterlik bir başlık yazın.');
    if (!cleanRoles.length) return notify('Rol ekleyin', 'En az bir karakter/rol eklemelisiniz.');
    const low = cleanRoles.find((r) => r.budget < MIN_ROLE_BUDGET);
    if (low) return notify('Bütçe düşük', `"${low.name}" için en az ${MIN_ROLE_BUDGET} TL girin.`);
    if (type === 'voice' && cleanRoles.some((r) => !r.lines.length)) {
      return notify('Replik eksik', 'Her role en az bir replik yazın.');
    }
    setSaving(true);
    try {
      const id = await api.createTask({
        type,
        title: title.trim(),
        description: description.trim(),
        video_url: videoUrl.trim(),
        language: 'Türkçe',
        deadline: addDays(days),
        mature,
        roles: cleanRoles,
      });
      setTitle('');
      setDescription('');
      setVideoUrl('');
      setScript('');
      setRoles([]);
      router.push(`/task/${id}`);
    } catch (e) {
      notify('Görev oluşturulamadı', errorText(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <Segmented<TaskType>
        value={type}
        onChange={setType}
        options={[
          { value: 'voice', label: 'Seslendirme / dublaj' },
          { value: 'script', label: 'Senaryo çekimi' },
        ]}
      />
      <Text style={[font.small, { marginTop: space(2), marginBottom: space(4) }]}>
        {type === 'voice'
          ? 'Videonuzdaki karakterleri seslendirecek kişileri bulun. Her karakter ayrı bir rol olur.'
          : 'Senaryonuzu oynayıp çekecek kişileri bulun. Başvuranlar kısa bir deneme kaydı gönderir.'}
      </Text>

      <Field label="Başlık" value={title} onChangeText={setTitle} placeholder="Ör. Ayşe neden gelmedi? — okul skeci" maxLength={120} />
      <Field
        label="Açıklama"
        value={description}
        onChangeText={setDescription}
        multiline
        placeholder={
          type === 'voice'
            ? 'Videonun konusu, istediğiniz ses tonu, teslim biçimi (her replik ayrı dosya gibi)'
            : 'Senaryonun özeti, mekân, süre, format (9:16), kim yayınlayacak'
        }
      />
      <Field
        label={type === 'voice' ? 'Video bağlantısı' : 'Örnek / referans bağlantısı (isteğe bağlı)'}
        value={videoUrl}
        onChangeText={setVideoUrl}
        autoCapitalize="none"
        keyboardType="url"
        placeholder="YouTube (liste dışı), Google Drive ya da TikTok bağlantısı"
        hint="Videoyu herkese açık yapmak zorunda değilsiniz; liste dışı bir bağlantı yeterli."
      />

      <Text style={[font.label, { marginBottom: space(2) }]}>Son teslim</Text>
      <Row style={{ marginBottom: space(4), flexWrap: 'wrap' }}>
        {[3, 7, 14, 30].map((d) => (
          <Pressable key={d} onPress={() => setDays(d)} style={[styles.chip, days === d && styles.chipOn]}>
            <Text style={[styles.chipText, days === d && { color: colors.white }]}>{d} gün</Text>
          </Pressable>
        ))}
      </Row>

      <Row style={{ justifyContent: 'space-between', marginBottom: space(2) }}>
        <View style={{ flex: 1 }}>
          <Text style={font.h3}>Argo / +18 dil içeriyor</Text>
          <Text style={font.small}>İşaretli görevler, bu içeriği görmek istemeyenlere gösterilmez.</Text>
        </View>
        <Switch value={mature} onValueChange={setMature} trackColor={{ true: colors.onAir, false: colors.line }} />
      </Row>

      <SectionTitle>Roller ve replikler</SectionTitle>
      <Card style={{ backgroundColor: colors.bg }}>
        <Row style={{ gap: 6, marginBottom: space(2) }}>
          <Ionicons name="flash" size={16} color={colors.onAir} />
          <Text style={font.h3}>Senaryonuzu yapıştırın, rolleri biz çıkaralım</Text>
        </Row>
        <Text style={[font.small, { marginBottom: space(3) }]}>
          Her satır: Karakter: replik (duygu) (bütçe). Aynı karakterin replikleri tek rolde toplanır, bütçeleri eklenir.
        </Text>
        <TextInput
          value={script}
          onChangeText={setScript}
          multiline
          placeholder={EXAMPLE}
          placeholderTextColor="#A39C8E"
          style={styles.script}
        />
        <Row style={{ marginTop: space(3), flexWrap: 'wrap' }}>
          <Button title="Rolleri çıkar" icon="sparkles-outline" kind="secondary" small onPress={importScript} />
          <Button title="Örneği dene" kind="ghost" small onPress={() => setScript(EXAMPLE)} />
        </Row>
      </Card>

      {roles.map((r, i) => (
        <Card key={i}>
          <Row style={{ justifyContent: 'space-between', marginBottom: space(2) }}>
            <Text style={font.label}>Rol {i + 1}</Text>
            <Pressable onPress={() => setRoles((rs) => rs.filter((_, j) => j !== i))}>
              <Text style={[font.small, { color: colors.onAir, fontWeight: '700' }]}>Kaldır</Text>
            </Pressable>
          </Row>
          <Field label="Karakter adı" value={r.name} onChangeText={(v) => updateRole(i, { name: v })} placeholder="Ahmet" />
          <Field
            label="Karakter notu"
            value={r.description}
            onChangeText={(v) => updateRole(i, { description: v })}
            placeholder="Yaş, kişilik, ses tonu"
          />
          <Text style={[font.label, { marginBottom: space(2) }]}>Ses</Text>
          <Row style={{ marginBottom: space(4) }}>
            {(['', 'kadın', 'erkek'] as const).map((g) => (
              <Pressable key={g || 'any'} onPress={() => updateRole(i, { gender_pref: g })} style={[styles.chip, r.gender_pref === g && styles.chipOn]}>
                <Text style={[styles.chipText, r.gender_pref === g && { color: colors.white }]}>
                  {g === '' ? 'Fark etmez' : g === 'kadın' ? 'Kadın' : 'Erkek'}
                </Text>
              </Pressable>
            ))}
          </Row>
          <Field
            label="Bütçe (TL)"
            value={String(r.budget || '')}
            onChangeText={(v) => updateRole(i, { budget: Number(v.replace(/\D/g, '')) || 0 })}
            keyboardType="number-pad"
            hint={`En az ${MIN_ROLE_BUDGET} TL. Seslendirmen ${formatTL(priceBreakdown(r.budget || 0).talentNet)} alır.`}
          />
          <Text style={[font.label, { marginBottom: space(2) }]}>Replikler</Text>
          {r.lines.map((l, k) => (
            <View key={k} style={styles.lineEdit}>
              <TextInput
                value={l.text}
                onChangeText={(v) => updateLine(i, k, { text: v })}
                placeholder="Replik"
                placeholderTextColor="#A39C8E"
                multiline
                style={[styles.lineInput, { flex: 1 }]}
              />
              <TextInput
                value={l.emotion}
                onChangeText={(v) => updateLine(i, k, { emotion: v })}
                placeholder="duygu"
                placeholderTextColor="#A39C8E"
                style={[styles.lineInput, { width: 110 }]}
              />
              <Pressable
                accessibilityLabel="Repliği sil"
                onPress={() => updateRole(i, { lines: r.lines.filter((_, x) => x !== k) })}
                style={{ padding: 6 }}
              >
                <Ionicons name="close" size={18} color={colors.inkSoft} />
              </Pressable>
            </View>
          ))}
          <Button
            title="Replik ekle"
            icon="add"
            kind="ghost"
            small
            onPress={() => updateRole(i, { lines: [...r.lines, { text: '', emotion: '' }] })}
          />
        </Card>
      ))}

      <Button title="Elle rol ekle" icon="person-add-outline" kind="ghost" onPress={() => setRoles((rs) => [...rs, emptyRole()])} />

      {roles.length ? (
        <Card style={{ marginTop: space(5) }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={font.body}>Roller toplamı</Text>
            <Text style={font.body}>{formatTL(total)}</Text>
          </Row>
          <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={font.small}>Güvenli ödeme hizmet bedeli (%5)</Text>
            <Text style={font.small}>{formatTL(price.ownerFee)}</Text>
          </Row>
          <View style={{ height: 1, backgroundColor: colors.line, marginVertical: space(3) }} />
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={font.h3}>Tüm roller seçilirse</Text>
            <Text style={[font.h3, { color: colors.onAir }]}>{formatTL(price.ownerTotal)}</Text>
          </Row>
          <Text style={[font.small, { marginTop: space(2) }]}>
            Şimdi ödeme yok. Her rol için seçim yaptığınızda o rolün ücreti güvenli ödemeye alınır, teslimi onaylayınca
            seslendirmene geçer.
          </Text>
        </Card>
      ) : null}

      <Button title="Görevi yayınla" icon="megaphone-outline" onPress={submit} loading={saving} style={{ marginTop: space(4) }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.ink },
  script: {
    minHeight: 120,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.m,
    padding: space(3),
    fontSize: 15,
    color: colors.ink,
    textAlignVertical: 'top',
  },
  lineEdit: { flexDirection: 'row', gap: space(2), alignItems: 'flex-start', marginBottom: space(2) },
  lineInput: {
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
