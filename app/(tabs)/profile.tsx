import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { api } from '../../src/data';
import { resetDemo } from '../../src/data/demo';
import { useAuth } from '../../src/lib/auth';
import { AudioPlayer } from '../../src/components/audio';
import { Button, Card, Empty, Pill, Row, Screen, SectionTitle, Stars } from '../../src/components/ui';
import { colors, font, space } from '../../src/theme';
import { confirm } from '../../src/lib/notify';

export default function ProfileTab() {
  const { userId, profile } = useAuth();
  const demoUsers = api.demoUsers();

  return (
    <Screen>
      {userId && profile ? (
        <>
          <Card>
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={font.h2}>{profile.display_name}</Text>
                <Row style={{ marginTop: space(1), flexWrap: 'wrap' }}>
                  <Stars value={profile.rating_avg} count={profile.rating_count} />
                  {profile.city ? <Text style={font.small}>· {profile.city}</Text> : null}
                  {profile.is_talent ? <Pill text="Seslendirmen" bg={colors.onAirSoft} fg={colors.onAir} /> : null}
                </Row>
              </View>
              <Button title="Düzenle" small kind="ghost" onPress={() => router.push('/edit-profile')} />
            </Row>
            {profile.bio ? <Text style={[font.body, { marginTop: space(3) }]}>{profile.bio}</Text> : null}
            {profile.voice_tags.length ? (
              <Row style={{ flexWrap: 'wrap', marginTop: space(3) }}>
                {profile.voice_tags.map((t) => (
                  <Pill key={t} text={t} />
                ))}
              </Row>
            ) : null}
            {profile.demo_path ? (
              <View style={{ marginTop: space(3) }}>
                <AudioPlayer path={profile.demo_path} label="Demo sesim" />
              </View>
            ) : profile.is_talent ? (
              <Text style={[font.small, { marginTop: space(3), color: colors.onAir }]}>
                Demo ses ekleyin: profilinde sesi olan yetenekler çok daha sık seçiliyor.
              </Text>
            ) : null}
            <Text style={[font.small, { marginTop: space(3) }]}>Tamamlanan iş: {profile.completed_count}</Text>
          </Card>
          <Button title="Herkese açık profilimi gör" kind="ghost" icon="eye-outline" onPress={() => router.push(`/talent/${profile.id}`)} />
        </>
      ) : (
        <Empty
          icon="person-circle-outline"
          title="Giriş yapmadınız"
          text="Görev vermek ya da rollere başvurmak için giriş yapın."
          action={<Button title="Giriş yap" onPress={() => router.push('/login')} />}
        />
      )}

      {api.mode === 'demo' ? (
        <>
          <SectionTitle>Demo: kim olarak deneyelim?</SectionTitle>
          <Text style={[font.small, { marginBottom: space(3) }]}>
            Aynı cihazda iki tarafı da deneyin: görev veren olarak seçim yapın, seslendirmen olarak başvurup teslim edin.
          </Text>
          {demoUsers.map((u) => (
            <Card key={u.id} onPress={() => api.switchDemoUser(u.id)} style={u.id === userId ? { borderColor: colors.onAir, borderWidth: 2 } : undefined}>
              <Row style={{ justifyContent: 'space-between' }}>
                <View>
                  <Text style={font.h3}>{u.display_name}</Text>
                  <Text style={font.small}>{u.role_hint}</Text>
                </View>
                {u.id === userId ? <Ionicons name="checkmark-circle" size={24} color={colors.onAir} /> : null}
              </Row>
            </Card>
          ))}
          <Pressable
            onPress={async () => {
              if (await confirm('Demoyu sıfırla', 'Tüm demo verileri silinip başa dönülecek.', 'Sıfırla')) await resetDemo();
            }}
          >
            <Text style={[font.small, { textAlign: 'center', marginTop: space(2) }]}>Demo verilerini sıfırla</Text>
          </Pressable>
        </>
      ) : null}

      <SectionTitle>Diğer</SectionTitle>
      <Card onPress={() => router.push('/legal')}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={font.body}>Kurallar, ücretler ve gizlilik</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} />
        </Row>
      </Card>
      {userId ? <Button title="Çıkış yap" kind="danger" onPress={() => api.signOut()} /> : null}
      <Text style={[font.small, { textAlign: 'center', marginTop: space(6) }]}>RolSes 0.1 · {api.mode === 'demo' ? 'Demo modu' : 'Canlı'}</Text>
    </Screen>
  );
}
