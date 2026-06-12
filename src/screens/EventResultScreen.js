import React from 'react';
import { View, Text, SectionList, Pressable, StyleSheet } from 'react-native';
import { useGame } from '../state/GameContext';
import { colors, space, radius } from '../ui/theme';

export default function EventResultScreen({ navigation }) {
  const { state } = useGame();
  const event = state.season[state.currentIndex];
  const outcome = state.outcomes[event.id];

  const sections = [
    { title: 'Ton score', data: outcome.player.breakdown.map((b) => ({ kind: 'breakdown', ...b })) },
    { title: 'Classement de la manche', data: outcome.leaderboard.map((s, i) => ({ kind: 'standing', rank: i + 1, ...s })) },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.total}>{outcome.player.total.toFixed(0)} pts</Text>
      <Text style={styles.sub}>{event.name} · Manche {event.round}</Text>
      <SectionList
        sections={sections}
        keyExtractor={(item, i) => (item.kind === 'standing' ? item.entrantId : item.slotId) + i}
        renderSectionHeader={({ section }) => <Text style={styles.section}>{section.title}</Text>}
        renderItem={({ item }) => item.kind === 'breakdown' ? (
          <View style={styles.row}>
            <Text style={styles.cell1}>{item.name || '—'}</Text>
            <Text style={styles.cell2}>{item.position ? `P${item.position}` : 'DNF'}</Text>
            <Text style={styles.cell3}>×{item.cote?.toFixed(1) ?? '—'}</Text>
            <Text style={styles.cell4}>{item.points.toFixed(0)}</Text>
          </View>
        ) : (
          <View style={[styles.row, item.isPlayer && styles.playerRow]}>
            <Text style={styles.cell1}>{item.rank}. {item.name}{item.isPlayer ? ' (toi)' : ''}</Text>
            <Text style={styles.cell4}>{item.score.toFixed(0)}</Text>
          </View>
        )}
        stickySectionHeadersEnabled={false}
      />
      <Pressable onPress={() => navigation.navigate('SeasonStandings')} style={styles.cta} accessibilityRole="button">
        <Text style={styles.ctaText}>Voir le classement saison</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: space.md },
  total: { fontSize: 40, fontWeight: '800', color: colors.primary, textAlign: 'center' },
  sub: { textAlign: 'center', color: colors.muted, marginBottom: space.md },
  section: { fontWeight: '700', color: colors.accent, marginTop: space.md, marginBottom: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.sm, padding: space.sm, marginVertical: 2, borderWidth: 1, borderColor: colors.border },
  playerRow: { borderColor: colors.primary, borderWidth: 2 },
  cell1: { flex: 1, color: colors.text }, cell2: { width: 44, color: colors.muted },
  cell3: { width: 44, color: colors.muted }, cell4: { width: 56, textAlign: 'right', fontWeight: '700', color: colors.text },
  cta: { backgroundColor: colors.primary, padding: space.md, borderRadius: radius.md, alignItems: 'center', marginTop: space.sm },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
