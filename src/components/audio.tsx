import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import * as DocumentPicker from 'expo-document-picker';
import { colors, font, radius, space } from '../theme';
import { api } from '../data';
import type { LocalMedia } from '../types';
import { notify, errorText } from '../lib/notify';
import { Button, Row } from './ui';

function mmss(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Yerel ya da sunucudaki bir sesi çalar. `path` sunucu yolu, `uri` doğrudan adres. */
export function AudioPlayer({ path, uri, label }: { path?: string | null; uri?: string | null; label?: string }) {
  const [src, setSrc] = useState<string | null>(uri ?? null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (uri) {
      setSrc(uri);
      return;
    }
    if (!path) return;
    api
      .mediaUrl(path)
      .then((u) => alive && setSrc(u))
      .catch((e) => alive && setErr(errorText(e)));
    return () => {
      alive = false;
    };
  }, [path, uri]);

  if (err) return <Text style={font.small}>Ses yüklenemedi: {err}</Text>;
  if (!src) return <View style={[styles.player, { opacity: 0.5 }]} />;
  return <PlayerInner key={src} src={src} label={label} />;
}

function PlayerInner({ src, label }: { src: string; label?: string }) {
  const player = useAudioPlayer({ uri: src });
  const status = useAudioPlayerStatus(player);
  const progress = status.duration ? Math.min(1, status.currentTime / status.duration) : 0;

  useEffect(() => {
    if (status.didJustFinish) player.seekTo(0);
  }, [status.didJustFinish, player]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={status.playing ? 'Durdur' : 'Dinle'}
      onPress={() => (status.playing ? player.pause() : player.play())}
      style={styles.player}
    >
      <View style={styles.playBtn}>
        <Ionicons name={status.playing ? 'pause' : 'play'} size={18} color={colors.white} />
      </View>
      <View style={{ flex: 1 }}>
        {label ? <Text style={[font.small, { color: colors.ink, fontWeight: '600' }]}>{label}</Text> : null}
        <View style={styles.track}>
          <View style={[styles.trackFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>
      <Text style={[font.small, { minWidth: 70, textAlign: 'right' }]}>
        {mmss(status.currentTime)} / {mmss(status.duration || 0)}
      </Text>
    </Pressable>
  );
}

/**
 * Ses kaydedici + dosya yükleme. Kayıt bitince `onChange` ile yerel dosyayı verir.
 * `allowVideo` ile senaryo görevlerinde video dosyası da seçilebilir.
 */
export function Recorder({
  value,
  onChange,
  allowVideo = false,
}: {
  value: LocalMedia | null;
  onChange: (m: LocalMedia | null) => void;
  allowVideo?: boolean;
}) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder, 200);
  const [busy, setBusy] = useState(false);

  async function start() {
    try {
      setBusy(true);
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        notify('Mikrofon izni gerekli', 'Kayıt yapabilmek için mikrofon iznini açın.');
        return;
      }
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      onChange(null);
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (e) {
      notify('Kayıt başlatılamadı', errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    try {
      setBusy(true);
      await recorder.stop();
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
      const uri = recorder.uri;
      if (!uri) throw new Error('Kayıt dosyası oluşmadı.');
      const web = Platform.OS === 'web';
      onChange({
        uri,
        name: web ? 'kayit.webm' : 'kayit.m4a',
        mimeType: web ? 'audio/webm' : 'audio/mp4',
      });
    } catch (e) {
      notify('Kayıt durdurulamadı', errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function pick() {
    const res = await DocumentPicker.getDocumentAsync({
      type: allowVideo ? ['audio/*', 'video/*'] : ['audio/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (res.canceled || !res.assets?.length) return;
    const a = res.assets[0];
    if (a.size && a.size > 50 * 1024 * 1024) {
      notify('Dosya çok büyük', 'En fazla 50 MB yükleyebilirsiniz.');
      return;
    }
    onChange({ uri: a.uri, name: a.name, mimeType: a.mimeType || 'application/octet-stream' });
  }

  const recording = state.isRecording;

  return (
    <View style={styles.recorder}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row>
          <View style={[styles.lamp, recording && styles.lampOn]} />
          <Text style={[font.label, recording && { color: colors.onAir }]}>
            {recording ? `Kayıtta · ${mmss((state.durationMillis || 0) / 1000)}` : value ? 'Kayıt hazır' : 'Stüdyo'}
          </Text>
        </Row>
        {value && !recording ? (
          <Pressable onPress={() => onChange(null)}>
            <Text style={[font.small, { color: colors.onAir, fontWeight: '700' }]}>Sil</Text>
          </Pressable>
        ) : null}
      </Row>

      {value && !recording ? (
        value.mimeType.startsWith('video') ? (
          <Text style={[font.body, { marginTop: space(3) }]}>Video seçildi: {value.name}</Text>
        ) : (
          <View style={{ marginTop: space(3) }}>
            <AudioPlayer uri={value.uri} label={value.name} />
          </View>
        )
      ) : null}

      <Row style={{ marginTop: space(3), flexWrap: 'wrap' }}>
        {recording ? (
          <Button title="Kaydı bitir" icon="stop" onPress={stop} loading={busy} />
        ) : (
          <Button title={value ? 'Yeniden kaydet' : 'Kaydet'} icon="mic" onPress={start} loading={busy} />
        )}
        {!recording ? (
          <Button
            title={allowVideo ? 'Dosya seç (ses/video)' : 'Dosya yükle'}
            icon="cloud-upload-outline"
            kind="ghost"
            onPress={pick}
          />
        ) : null}
      </Row>
      <Text style={[font.small, { marginTop: space(2) }]}>
        İpucu: Sessiz bir odada, telefonu ağzınızdan bir karış uzakta tutun.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  player: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    backgroundColor: colors.bg,
    borderRadius: radius.m,
    padding: space(2.5),
    minHeight: 52,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: { height: 4, backgroundColor: colors.line, borderRadius: 2, marginTop: 6, overflow: 'hidden' },
  trackFill: { height: 4, backgroundColor: colors.onAir },
  recorder: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.l,
    padding: space(4),
  },
  lamp: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.line },
  lampOn: { backgroundColor: colors.onAir },
});
