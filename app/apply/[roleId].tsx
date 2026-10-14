import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '../../src/data';
import { useAuth } from '../../src/lib/auth';
import { useLoader } from '../../src/lib/useAsync';
import { Recorder } from '../../src/components/audio';
import { Button, Card, Empty, Field, Loading, Screen } from '../../src/components/ui';
import { colors, font, space } from '../../src/theme';
import { errorText, notify } from '../../src/lib/notify';
import { formatTL, priceBreakdown } from '../../src/lib/pricing';
import type { LocalMedia } from '../../src/types';

export default function Apply() {
  const { roleId } = useLocalSearchParams<{ roleId: string }>();
  const { userId } = useAuth();
  const { data, loading } = useLoader(async () => {
    const tasks = await api.listTasks({});
    for (const t of tasks) {
      const r = t.roles.find((x) => x.id === roleId);
      if (r) return { task: t, role: r };
    }
    return null;
  }, [roleId]);
  const [media, setMedia] = useState<LocalMedia | null>(null);
  const [link, setLink] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  if (!userId) {
    return (
      <Screen>
        <Empty icon="lock-closed-outline" title="Başvurmak için giriş yapın" action={<Button title="Giriş yap" onPress={() => router.replace('/login')} />} />
      </Screen>
    );
  }
  if (loading && !data) return <Loading />;
  if (!data) return <Screen><Empty icon="close-circle-outline" title="Bu rol artık açık değil" /></Screen>;

  const { task, role } = data;
  const isScript = task.type === 'script';
  const net = priceBreakdown(Number(role.budget)).talentNet;

  async function send() {
    if (!media && !link.trim()) {
      notify('Deneme kaydı gerekli', isScript ? 'Bir ses/video kaydı ya da bağlantısı ekleyin.' : 'Repliklerden birini kaydedin ya da bir ses dosyası yükleyin.');
      return;
    }
    setSending(true);
    try {
      await api.apply(role.id, { media, link: link.trim(), note: note.trim() });
      notify('Başvurun gönderildi', 'Görev veren dinleyince haber vereceğiz. İşlerim sekmesinden takip edebilirsin.');
      router.back();
    } catch (e) {
      notify('Başvuru gönderilemedi', errorText(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <Screen>
      <Text style={font.label}>{task.title}</Text>
      <Text style={[font.h2, { marginTop: space(1) }]}>{role.name}</Text>
      <Text style={[font.small, { marginTop: space(1) }]}>
        Bütçe {formatTL(Number(role.budget))} · seçilirsen eline geçecek: {formatTL(net)}
      </Text>
      {role.description ? <Text style={[font.body, { marginTop: space(2) }]}>{role.description}</Text> : null}

      <Card style={{ marginTop: space(4), backgroundColor: colors.bg }}>
        <Text style={[font.label, { marginBottom: space(2) }]}>Okuyacağın replikler</Text>
        {role.lines.map((l, i) => (
          <View key={i} style={{ marginBottom: space(2), borderLeftWidth: 3, borderLeftColor: colors.onAir, paddingLeft: space(3) }}>
            <Text style={{ fontSize: 18, lineHeight: 26, color: colors.ink, fontStyle: 'italic' }}>“{l.text}”</Text>
            {l.emotion ? <Text style={font.small}>({l.emotion})</Text> : null}
          </View>
        ))}
      </Card>

      <Recorder value={media} onChange={setMedia} allowVideo={isScript} />

      <View style={{ height: space(4) }} />
      {isScript ? (
        <Field
          label="ya da deneme videosu bağlantısı"
          value={link}
          onChangeText={setLink}
          autoCapitalize="none"
          keyboardType="url"
          placeholder="YouTube (liste dışı) ya da Drive bağlantısı"
        />
      ) : null}
      <Field
        label="Görev verene not (isteğe bağlı)"
        value={note}
        onChangeText={setNote}
        multiline
        maxLength={600}
        placeholder="Bu karakteri nasıl yorumladın, ekipmanın, ne kadar sürede teslim edersin"
        hint="İletişim bilgisi (telefon, e-posta, IBAN) paylaşmak yasaktır; ödemen yalnızca platformda güvende."
      />
      <Button title="Başvuruyu gönder" icon="send" onPress={send} loading={sending} />
    </Screen>
  );
}
