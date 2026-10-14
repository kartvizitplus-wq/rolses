import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { api } from '../src/data';
import { useAuth } from '../src/lib/auth';
import { Button, Card, Field, Row, Screen } from '../src/components/ui';
import { colors, font, radius, space } from '../src/theme';
import { errorText, notify } from '../src/lib/notify';

export default function Login() {
  const { userId } = useAuth();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState<'google' | 'email' | null>(null);

  useEffect(() => {
    if (userId) {
      if (router.canGoBack()) router.back();
      else router.replace('/');
    }
  }, [userId]);

  async function google() {
    setBusy('google');
    try {
      await api.signInWithGoogle();
    } catch (e) {
      notify('Google ile giriş yapılamadı', errorText(e));
    } finally {
      setBusy(null);
    }
  }

  async function withEmail() {
    if (!email.includes('@') || password.length < 6) {
      notify('Bilgileri kontrol edin', 'Geçerli bir e-posta ve en az 6 karakterli şifre girin.');
      return;
    }
    setBusy('email');
    try {
      if (mode === 'in') await api.signInWithEmail(email.trim(), password);
      else await api.signUpWithEmail(email.trim(), password, name.trim());
    } catch (e) {
      notify(mode === 'in' ? 'Giriş yapılamadı' : 'Kayıt', errorText(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen>
      <View style={{ alignItems: 'center', marginVertical: space(6) }}>
        <View style={styles.mark}>
          <Ionicons name="mic" size={30} color={colors.white} />
        </View>
        <Text style={[font.h1, { marginTop: space(4), textAlign: 'center' }]}>RolSes’e hoş geldin</Text>
        <Text style={[font.small, { textAlign: 'center', marginTop: space(2), maxWidth: 320 }]}>
          Videona gerçek ses bul ya da sesinle para kazan. Tek hesapla ikisini de yapabilirsin.
        </Text>
      </View>

      <Pressable onPress={google} style={({ pressed }) => [styles.google, pressed && { opacity: 0.85 }]}>
        <Text style={styles.gLogo}>G</Text>
        <Text style={styles.googleText}>{busy === 'google' ? 'Bağlanıyor…' : 'Google ile devam et'}</Text>
      </Pressable>

      <Row style={{ marginVertical: space(5) }}>
        <View style={styles.rule} />
        <Text style={font.small}>ya da e-posta ile</Text>
        <View style={styles.rule} />
      </Row>

      <Card>
        {mode === 'up' ? <Field label="Adın" value={name} onChangeText={setName} placeholder="Ad Soyad ya da sahne adı" /> : null}
        <Field label="E-posta" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="ornek@mail.com" />
        <Field label="Şifre" value={password} onChangeText={setPassword} secureTextEntry placeholder="En az 6 karakter" />
        <Button title={mode === 'in' ? 'Giriş yap' : 'Hesap oluştur'} kind="secondary" onPress={withEmail} loading={busy === 'email'} />
        <Pressable onPress={() => setMode(mode === 'in' ? 'up' : 'in')} style={{ marginTop: space(3) }}>
          <Text style={[font.small, { textAlign: 'center' }]}>
            {mode === 'in' ? 'Hesabın yok mu? ' : 'Zaten hesabın var mı? '}
            <Text style={{ color: colors.onAir, fontWeight: '700' }}>{mode === 'in' ? 'Kaydol' : 'Giriş yap'}</Text>
          </Text>
        </Pressable>
      </Card>

      {api.mode === 'demo' ? (
        <Card style={{ backgroundColor: colors.amberSoft, borderColor: colors.amberSoft }}>
          <Text style={[font.h3, { marginBottom: space(2) }]}>Demo ile hemen dene</Text>
          {api.demoUsers().map((u) => (
            <Button
              key={u.id}
              title={`${u.display_name} — ${u.role_hint}`}
              kind="ghost"
              small
              style={{ marginBottom: space(2), backgroundColor: colors.card }}
              onPress={() => api.switchDemoUser(u.id)}
            />
          ))}
        </Card>
      ) : null}

      <Text style={[font.small, { textAlign: 'center', marginTop: space(4) }]}>
        Devam ederek kullanım koşullarını ve KVKK aydınlatma metnini kabul etmiş olursun.{' '}
        <Text style={{ color: colors.onAir }} onPress={() => router.push('/legal')}>
          Oku
        </Text>
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  mark: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.onAir,
    alignItems: 'center',
    justifyContent: 'center',
  },
  google: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space(3),
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.pill,
    minHeight: 54,
  },
  gLogo: { fontSize: 20, fontWeight: '900', color: '#4285F4' },
  googleText: { fontSize: 16, fontWeight: '700', color: colors.ink },
  rule: { flex: 1, height: 1, backgroundColor: colors.line },
});
