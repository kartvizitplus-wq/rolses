import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { Role, Task } from '../types';
import { colors, font, radius, space } from '../theme';
import { formatTL } from '../lib/pricing';
import { formatDate, timeAgo } from '../lib/id';
import { Button, Card, Pill, Row, StatusPill } from './ui';

export function TaskCard({ task, showStatus }: { task: Task; showStatus?: boolean }) {
  const open = task.roles.filter((r) => r.status === 'open');
  const total = task.roles.reduce((s, r) => s + Number(r.budget), 0);
  const isScript = task.type === 'script';
  return (
    <Card onPress={() => router.push(`/task/${task.id}`)}>
      <Row style={{ justifyContent: 'space-between', marginBottom: space(2) }}>
        <Row>
          <Pill
            text={isScript ? 'Senaryo · çekim' : 'Seslendirme'}
            fg={isScript ? colors.blue : colors.onAir}
            bg={isScript ? colors.blueSoft : colors.onAirSoft}
          />
          {task.mature ? <Pill text="+18 dil" /> : null}
        </Row>
        {showStatus ? <StatusPill status={task.status} /> : <Text style={font.small}>{timeAgo(task.created_at)}</Text>}
      </Row>
      <Text style={[font.h3, { marginBottom: space(1.5) }]} numberOfLines={2}>
        {task.title}
      </Text>
      <Text style={font.small} numberOfLines={2}>
        {task.description}
      </Text>
      <View style={styles.roleStrip}>
        {task.roles.slice(0, 4).map((r) => (
          <View key={r.id} style={[styles.roleChip, r.status !== 'open' && { opacity: 0.45 }]}>
            <Text style={styles.roleChipName} numberOfLines={1}>
              {r.name}
            </Text>
            <Text style={styles.roleChipBudget}>{formatTL(Number(r.budget))}</Text>
          </View>
        ))}
        {task.roles.length > 4 ? <Text style={font.small}>+{task.roles.length - 4}</Text> : null}
      </View>
      <Row style={{ justifyContent: 'space-between', marginTop: space(3) }}>
        <Text style={font.small}>
          {open.length}/{task.roles.length} rol açık · toplam {formatTL(total)}
        </Text>
        {task.deadline ? (
          <Row style={{ gap: 4 }}>
            <Ionicons name="time-outline" size={14} color={colors.inkSoft} />
            <Text style={font.small}>{formatDate(task.deadline)}</Text>
          </Row>
        ) : null}
      </Row>
    </Card>
  );
}

export function RoleCard({
  role,
  canApply,
  applied,
  onApply,
  footer,
}: {
  role: Role;
  canApply: boolean;
  applied?: boolean;
  onApply?: () => void;
  footer?: React.ReactNode;
}) {
  return (
    <View style={styles.role}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={font.h3}>{role.name}</Text>
          {role.description ? <Text style={[font.small, { marginTop: 2 }]}>{role.description}</Text> : null}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <Text style={styles.budget}>{formatTL(Number(role.budget))}</Text>
          {role.status !== 'open' ? <StatusPill status={role.status} /> : null}
        </View>
      </Row>

      <View style={{ marginTop: space(3), gap: space(2) }}>
        {role.lines.map((l, i) => (
          <View key={i} style={styles.line}>
            <Text style={styles.lineText}>“{l.text}”</Text>
            {l.emotion ? <Text style={styles.emotion}>({l.emotion})</Text> : null}
          </View>
        ))}
      </View>

      <Row style={{ justifyContent: 'space-between', marginTop: space(3), flexWrap: 'wrap' }}>
        <Row style={{ gap: 6 }}>
          {role.gender_pref ? <Pill text={`${role.gender_pref} sesi`} /> : <Pill text="her ses" />}
          <Pill text={`${role.application_count} başvuru`} />
        </Row>
        {canApply && role.status === 'open' ? (
          applied ? (
            <Pill text="Başvurdun" fg={colors.green} bg={colors.greenSoft} />
          ) : (
            <Button title="Başvur" icon="mic" small onPress={onApply} />
          )
        ) : null}
      </Row>
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  roleStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2), marginTop: space(3), alignItems: 'center' },
  roleChip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.m,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 170,
  },
  roleChipName: { fontSize: 13, fontWeight: '700', color: colors.ink },
  roleChipBudget: { fontSize: 12, color: colors.onAir, fontWeight: '700' },
  role: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space(4),
    marginBottom: space(3),
  },
  budget: { fontSize: 18, fontWeight: '800', color: colors.onAir },
  line: {
    borderLeftWidth: 3,
    borderLeftColor: colors.onAir,
    paddingLeft: space(3),
    paddingVertical: 2,
  },
  lineText: { fontSize: 16, lineHeight: 23, color: colors.ink, fontStyle: 'italic' },
  emotion: { fontSize: 13, color: colors.inkSoft, marginTop: 2 },
});
