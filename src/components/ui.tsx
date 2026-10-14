import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, radius, space, statusLabels } from '../theme';

export function Screen({
  children,
  scroll = true,
  contentStyle,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  if (!scroll) return <View style={[styles.screen, styles.inner, contentStyle]}>{children}</View>;
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.inner, contentStyle]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.maxWidth}>{children}</View>
    </ScrollView>
  );
}

type ButtonKind = 'primary' | 'secondary' | 'ghost' | 'danger' | 'onDark';

export function Button({
  title,
  onPress,
  kind = 'primary',
  icon,
  loading,
  disabled,
  style,
  small,
}: {
  title: string;
  onPress?: () => void;
  kind?: ButtonKind;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const palette = {
    primary: { bg: colors.onAir, fg: colors.white, border: colors.onAir },
    secondary: { bg: colors.ink, fg: colors.white, border: colors.ink },
    ghost: { bg: 'transparent', fg: colors.ink, border: colors.line },
    danger: { bg: 'transparent', fg: colors.onAir, border: colors.onAirSoft },
    onDark: { bg: 'transparent', fg: colors.white, border: '#4A4358' },
  }[kind];
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={off ? undefined : onPress}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: off ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={small ? 16 : 18} color={palette.fg} /> : null}
          <Text style={[styles.buttonText, small && { fontSize: 14 }, { color: palette.fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Card({ children, style, onPress }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Pill({ text, fg = colors.inkSoft, bg = colors.line }: { text: string; fg?: string; bg?: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, { color: fg }]}>{text}</Text>
    </View>
  );
}

export function StatusPill({ status }: { status: string }) {
  const s = statusLabels[status] ?? { text: status, fg: colors.inkSoft, bg: colors.line };
  return <Pill text={s.text} fg={s.fg} bg={s.bg} />;
}

export function Field({
  label,
  hint,
  ...props
}: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={{ marginBottom: space(4) }}>
      <Text style={[font.label, { marginBottom: space(1.5) }]}>{label}</Text>
      <TextInput
        placeholderTextColor="#A39C8E"
        {...props}
        style={[styles.input, props.multiline && { minHeight: 96, textAlignVertical: 'top' }, props.style]}
      />
      {hint ? <Text style={[font.small, { marginTop: space(1) }]}>{hint}</Text> : null}
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segment}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.segmentItem, active && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, active && { color: colors.white }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Loading() {
  return (
    <View style={{ padding: space(10), alignItems: 'center' }}>
      <ActivityIndicator color={colors.onAir} />
    </View>
  );
}

export function Empty({ icon, title, text, action }: { icon: keyof typeof Ionicons.glyphMap; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={36} color={colors.inkSoft} />
      <Text style={[font.h3, { marginTop: space(3), textAlign: 'center' }]}>{title}</Text>
      {text ? <Text style={[font.small, { textAlign: 'center', marginTop: space(1.5) }]}>{text}</Text> : null}
      {action ? <View style={{ marginTop: space(4) }}>{action}</View> : null}
    </View>
  );
}

export function ErrorBox({ text }: { text: string }) {
  return (
    <View style={styles.errorBox}>
      <Ionicons name="alert-circle" size={18} color={colors.onAir} />
      <Text style={[font.small, { color: colors.onAir, flex: 1 }]}>{text}</Text>
    </View>
  );
}

export function Stars({ value, count, size = 13 }: { value: number; count?: number; size?: number }) {
  if (!count) return <Text style={[font.small, { fontSize: size }]}>Yeni üye</Text>;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <Ionicons name="star" size={size} color={colors.amber} />
      <Text style={[font.small, { fontSize: size, color: colors.ink, fontWeight: '700' }]}>
        {Number(value).toFixed(1)}
      </Text>
      <Text style={[font.small, { fontSize: size }]}>({count})</Text>
    </View>
  );
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={font.h3}>{children}</Text>
      {right}
    </View>
  );
}

export function Row({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: space(2) }, style]}>{children}</View>;
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  inner: { padding: space(4), paddingBottom: space(16) },
  maxWidth: { width: '100%', maxWidth: 760, alignSelf: 'center' },
  button: {
    minHeight: 48,
    paddingHorizontal: space(5),
    borderRadius: radius.pill,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space(2),
  },
  buttonSmall: { minHeight: 38, paddingHorizontal: space(4) },
  buttonText: { fontSize: 16, fontWeight: '700' },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space(4),
    marginBottom: space(3),
  },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, alignSelf: 'flex-start' },
  pillText: { fontSize: 12, fontWeight: '700' },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.m,
    paddingHorizontal: space(3.5),
    paddingVertical: space(3),
    fontSize: 16,
    color: colors.ink,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.line,
    borderRadius: radius.pill,
    padding: 4,
    gap: 4,
  },
  segmentItem: { flex: 1, paddingVertical: 9, borderRadius: radius.pill, alignItems: 'center' },
  segmentActive: { backgroundColor: colors.ink },
  segmentText: { fontSize: 14, fontWeight: '700', color: colors.ink },
  empty: { alignItems: 'center', padding: space(8) },
  errorBox: {
    flexDirection: 'row',
    gap: space(2),
    alignItems: 'center',
    backgroundColor: colors.onAirSoft,
    padding: space(3),
    borderRadius: radius.m,
    marginBottom: space(3),
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space(5),
    marginBottom: space(3),
  },
});
