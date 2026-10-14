import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { api } from '../../src/data';
import { useAuth } from '../../src/lib/auth';
import { useLoader } from '../../src/lib/useAsync';
import { TaskCard } from '../../src/components/cards';
import { Button, Empty, ErrorBox, Loading, Row, Screen, Segmented } from '../../src/components/ui';
import { colors, font, radius, space } from '../../src/theme';
import type { TaskFilter } from '../../src/types';

type TypeFilter = 'all' | 'voice' | 'script';

export default function Discover() {
  const insets = useSafeAreaInsets();
  const { userId, profile } = useAuth();
  const [type, setType] = useState<TypeFilter>('all');
  const [search, setSearch] = useState('');
  const [gender, setGender] = useState<TaskFilter['gender']>('');
  const filter: TaskFilter = { type, search, gender };
  const { data, loading, error } = useLoader(() => api.listTasks(filter), [type, search, gender]);

  return (
    <Screen contentStyle={{ paddingTop: insets.top + space(4) }}>
      <Row style={{ justifyContent: 'space-between', marginBottom: space(4) }}>
        <Row style={{ gap: 8 }}>
          <View style={styles.logoDot} />
          <Text style={styles.logo}>RolSes</Text>
        </Row>
        {userId ? (
          <Text style={font.small}>Merhaba, {profile?.display_name?.split(' ')[0] ?? ''}</Text>
        ) : (
          <Button title="Giriş yap" small kind="ghost" onPress={() => router.push('/login')} />
        )}
      </Row>

      {!userId ? (
        <View style={styles.hero}>
          <Text style={styles.heroKicker}>YAPAY ZEKÂ DEĞİL, GERÇEK SES</Text>
          <Text style={styles.heroTitle}>Videondaki her karaktere gerçek bir ses bul.</Text>
          <Text style={styles.heroText}>
            Replikleri yaz, her role bütçe koy. Seslendirmenler telefondan 30 saniyede sesli başvursun; beğendiğini seç,
            ödemen teslim onaylanana kadar güvende kalsın.
          </Text>
          <Row style={{ marginTop: space(4), flexWrap: 'wrap' }}>
            <Button title="Görev ver" icon="add" onPress={() => router.push('/create')} />
            <Button
              title="Seslendirmen ol"
              kind="onDark"
              icon="mic-outline"
              onPress={() => router.push('/login')}
            />
          </Row>
        </View>
      ) : null}

      {api.mode === 'demo' ? (
        <Pressable onPress={() => router.push('/profile')} style={styles.demoBar}>
          <Ionicons name="flask-outline" size={16} color={colors.amber} />
          <Text style={[font.small, { color: colors.amber, flex: 1 }]}>
            Demo modu: veriler bu cihazda tutulur. Profil sekmesinden görev veren ↔ seslendirmen arasında geçiş yapabilirsiniz.
          </Text>
        </Pressable>
      ) : null}

      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.inkSoft} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Görev, karakter ya da konu ara"
          placeholderTextColor="#A39C8E"
          style={styles.searchInput}
        />
      </View>

      <Segmented<TypeFilter>
        value={type}
        onChange={setType}
        options={[
          { value: 'all', label: 'Tümü' },
          { value: 'voice', label: 'Seslendirme' },
          { value: 'script', label: 'Senaryo' },
        ]}
      />

      <Row style={{ marginTop: space(3), marginBottom: space(3) }}>
        {(['', 'kadın', 'erkek'] as const).map((g) => (
          <Pressable key={g || 'any'} onPress={() => setGender(g)} style={[styles.chip, gender === g && styles.chipOn]}>
            <Text style={[styles.chipText, gender === g && { color: colors.white }]}>
              {g === '' ? 'Her ses' : g === 'kadın' ? 'Kadın sesi' : 'Erkek sesi'}
            </Text>
          </Pressable>
        ))}
      </Row>

      {error ? <ErrorBox text={error} /> : null}
      {loading && !data ? (
        <Loading />
      ) : data && data.length ? (
        data.map((t) => <TaskCard key={t.id} task={t} />)
      ) : (
        <Empty
          icon="mic-off-outline"
          title="Uygun görev bulunamadı"
          text="Filtreleri değiştirin ya da ilk görevi siz verin."
          action={<Button title="Görev ver" icon="add" onPress={() => router.push('/create')} />}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  logo: { fontSize: 24, fontWeight: '900', letterSpacing: -0.8, color: colors.ink },
  logoDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.onAir },
  hero: {
    backgroundColor: colors.ink,
    borderRadius: radius.l,
    padding: space(6),
    marginBottom: space(4),
  },
  heroKicker: { color: colors.onAir, fontWeight: '800', letterSpacing: 1.2, fontSize: 12 },
  heroTitle: { color: colors.white, fontSize: 30, fontWeight: '900', letterSpacing: -0.8, marginTop: space(2), lineHeight: 35 },
  heroText: { color: '#C9C3D3', fontSize: 15, lineHeight: 22, marginTop: space(3) },
  demoBar: {
    flexDirection: 'row',
    gap: space(2),
    alignItems: 'center',
    backgroundColor: colors.amberSoft,
    borderRadius: radius.m,
    padding: space(3),
    marginBottom: space(4),
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2),
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingHorizontal: space(4),
    marginBottom: space(3),
  },
  searchInput: { flex: 1, paddingVertical: space(3), fontSize: 16, color: colors.ink },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.ink },
});
