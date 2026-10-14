import React from 'react';
import { Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { api } from '../../src/data';
import { useLoader } from '../../src/lib/useAsync';
import { AudioPlayer } from '../../src/components/audio';
import { Card, Empty, Loading, Pill, Row, Screen, SectionTitle, Stars } from '../../src/components/ui';
import { colors, font, space } from '../../src/theme';
import { timeAgo } from '../../src/lib/id';

export default function TalentProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading } = useLoader(async () => {
    const [profile, reviews] = await Promise.all([api.getProfile(String(id)), api.listReviewsFor(String(id))]);
    return { profile, reviews };
  }, [id]);

  if (loading && !data) return <Loading />;
  const p = data?.profile;
  if (!p) return <Screen><Empty icon="person-outline" title="Profil bulunamadı" /></Screen>;

  return (
    <Screen>
      <Stack.Screen options={{ title: p.display_name }} />
      <Card>
        <Text style={font.h2}>{p.display_name}</Text>
        <Row style={{ marginTop: space(1), flexWrap: 'wrap' }}>
          <Stars value={p.rating_avg} count={p.rating_count} />
          {p.city ? <Text style={font.small}>· {p.city}</Text> : null}
          {p.is_talent ? <Pill text="Seslendirmen" fg={colors.onAir} bg={colors.onAirSoft} /> : null}
        </Row>
        {p.bio ? <Text style={[font.body, { marginTop: space(3) }]}>{p.bio}</Text> : null}
        {p.voice_tags.length ? (
          <Row style={{ flexWrap: 'wrap', marginTop: space(3) }}>
            {p.voice_tags.map((t) => (
              <Pill key={t} text={t} />
            ))}
          </Row>
        ) : null}
        {p.demo_path ? (
          <View style={{ marginTop: space(3) }}>
            <AudioPlayer path={p.demo_path} label="Demo ses" />
          </View>
        ) : null}
        <Text style={[font.small, { marginTop: space(3) }]}>Tamamlanan iş: {p.completed_count}</Text>
      </Card>

      <SectionTitle>Yorumlar</SectionTitle>
      {data?.reviews.length ? (
        data.reviews.map((r) => (
          <Card key={r.id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={{ color: colors.amber, fontSize: 16 }}>{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</Text>
              <Text style={font.small}>{timeAgo(r.created_at)}</Text>
            </Row>
            {r.comment ? <Text style={[font.body, { marginTop: space(2) }]}>{r.comment}</Text> : null}
          </Card>
        ))
      ) : (
        <Text style={font.small}>Henüz yorum yok.</Text>
      )}
    </Screen>
  );
}
