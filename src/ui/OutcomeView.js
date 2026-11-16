import React from 'react';
import { View, Text, SectionList, StyleSheet } from 'react-native';
import { colors, space, radius } from './theme';
import { RARITY_LABELS } from '../engine/rarity';

export default function OutcomeView({ event, outcome }) {
  const played = outcome.player.breakdown.some((b) => b.riderId);
  const sections = [
    { title: 'Ton score', data: played ? outcome.player.breakdown.map((b) => ({ kind: 'breakdown', ...b })) : [] },
    { title: 'Effets déclenchés', data: played ? outcome.player.effects.map((e, i) => ({ kind: 'effect', key: `${e.cardId}:${i}`, ...e })) : [] },
    { title: 'Classement de la manche', data: outcome.leaderboard.map((s, i) => ({ kind: 'standing', rank: i + 1, ...s })) },
  ];

  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.total}>{outcome.player.total.toFixed(0)} pts</Text>
      <Text style={styles.sub}>{event.name} · Manche {event.round}</Text>
      {!played && <Text style={styles.sub}>Non jouée — aucune équipe enregistrée</Text>}
      <SectionList
        sections={sections}
        keyExtractor={(item, i) => (item.kind === 'standing' ? item.entrantId : item.kind === 'effect' ? item.key : item.slotId) + i}
        renderSectionHeader={({ section }) => <Text style={styles.section}>{section.title}</Text>}
        renderItem={({ item }) => {
          if (item.kind === 'breakdown') return (
            <View style={styles.row}>
              <Text style={styles.cell1}>{item.name || '—'}{item.rarity ? ` · ${RARITY_LABELS[item.rarity]}` : ''}</Text>
              <Text style={styles.cell2}>{item.position ? `P${item.position}` : 'DNF'}</Text>
              <Text style={styles.cell3}>×{item.cote?.toFixed(1) ?? '—'}</Text>
              <Text style={styles.cell4}>{item.points.toFixed(0)}</Text>
            </View>
          );
          if (item.kind === 'effect') return (
            <View style={styles.row}>
              <View style={styles.cell1}>
                <Text style={styles.effectName}>{item.name} · {RARITY_LABELS[item.rarity]}</Text>
                <Text style={styles.effectText}>{item.description}</Text>
              </View>
              <Text style={styles.cell4}>+{item.points.toFixed(0)}</Text>
            </View>
          );
          return (
            <View style={[styles.row, item.isPlayer && styles.playerRow]}>
              <Text style={styles.cell1}>{item.rank}. {item.name}{item.isPlayer ? ' (toi)' : ''}</Text>
              <Text style={styles.cell4}>{item.score.toFixed(0)}</Text>
            </View>
          );
        }}
        stickySectionHeadersEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  total: { fontSize: 40, fontWeight: '800', color: colors.primary, textAlign: 'center' },
  sub: { textAlign: 'center', color: colors.muted, marginBottom: space.md },
  section: { fontWeight: '700', color: colors.accent, marginTop: space.md, marginBottom: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.sm, padding: space.sm, marginVertical: 2, borderWidth: 1, borderColor: colors.border },
  playerRow: { borderColor: colors.primary, borderWidth: 2 },
  effectName: { color: colors.text, fontWeight: '600' },
  effectText: { color: colors.muted, fontSize: 12 },
  cell1: { flex: 1, color: colors.text }, cell2: { width: 44, color: colors.muted },
  cell3: { width: 44, color: colors.muted }, cell4: { width: 56, textAlign: 'right', fontWeight: '700', color: colors.text },
});
