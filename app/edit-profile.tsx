import React, { useEffect, useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { api } from '../src/data';
import { useAuth } from '../src/lib/auth';
import { Recorder } from '../src/components/audio';
import { Button, Field, Row, Screen, SectionTitle } from '../src/components/ui';
import { colors, font, radius, space } from '../src/theme';
import { errorText, notify } from '../src/lib/notify';
import type { LocalMedia, Profile } from '../src/types';

export default function EditProfile() {
  const { profile, refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [gender, setGender] = useState<Profile['gender']>('');
  const [tags, setTags] = useState('');
  const [isTalent, setIsTalent] = useState(false);
  const [demo, setDemo] = useState<LocalMedia | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setName(profile.display_name);
    setBio(profile.bio);
    setCity(profile.city);
    setGender(profile.gender);
    setTags(profile.voice_tags.join(', '));
    setIsTalent(profile.is_talent);
  }, [profile]);

  async function save() {
    if (name.trim().length < 2) return notify('Ad gerekli', 'En az 2 karakterlik bir ad yazın.');
    setSaving(true);
    try {
      await api.updateMyProfile(
        {
          display_name: name.trim(),
          bio: bio.trim(),
          city: city.trim(),
          gender,
          voice_tags: tags
            .split(',')
            .map((t) => t.trim().toLocaleLowerCase('tr'))
            .filter(Boolean)
            .slice(0, 8),
          is_talent: isTalent,
        },
        demo,
      );
      await refreshProfile();
      router.back();
    } catch (e) {
      notify('Kaydedilemedi', errorText(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <Field label="Ad / sahne adı" value={name} onChangeText={setName} />
      <Field label="Şehir" value={city} onChangeText={setCity} placeholder="İstanbul" />
      <Field label="Hakkında" value={bio} onChangeText={setBio} multiline maxLength={500} placeholder="Deneyimin, ekipmanın, hangi işleri yaptığın" />

      <Row style={{ justifyContent: 'space-between', marginBottom: space(4) }}>
        <View style={{ flex: 1 }}>
          <Text style={font.h3}>Seslendirmen / oyuncuyum</Text>
          <Text style={font.small}>Açıksa profilin yetenek olarak görünür.</Text>
        </View>
        <Switch value={isTalent} onValueChange={setIsTalent} trackColor={{ true: colors.onAir, false: colors.line }} />
      </Row>

      {isTalent ? (
        <>
          <Text style={[font.label, { marginBottom: space(2) }]}>Ses</Text>
          <Row style={{ marginBottom: space(4) }}>
            {(['', 'kadın', 'erkek'] as const).map((g) => (
              <Pressable
                key={g || 'none'}
                onPress={() => setGender(g)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: radius.pill,
                  borderWidth: 1.5,
                  borderColor: gender === g ? colors.ink : colors.line,
                  backgroundColor: gender === g ? colors.ink : 'transparent',
                }}
              >
                <Text style={{ fontWeight: '700', color: gender === g ? colors.white : colors.ink }}>
                  {g === '' ? 'Belirtme' : g === 'kadın' ? 'Kadın' : 'Erkek'}
                </Text>
              </Pressable>
            ))}
          </Row>
          <Field label="Ses etiketleri" value={tags} onChangeText={setTags} placeholder="genç, enerjik, komedi, reklam" hint="Virgülle ayırın, en fazla 8." />
          <SectionTitle>Demo ses</SectionTitle>
          <Text style={[font.small, { marginBottom: space(3) }]}>
            20–40 saniyelik, farklı tonlarını gösteren bir kayıt. Görev verenler profilinde dinler.
          </Text>
          <Recorder value={demo} onChange={setDemo} />
        </>
      ) : null}

      <Button title="Kaydet" onPress={save} loading={saving} style={{ marginTop: space(5) }} />
    </Screen>
  );
}
