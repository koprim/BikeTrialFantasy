import React from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useGame } from '../state/GameContext';
import { aggregateStandings } from '../engine/season';
import { colors, space, radius } from '../ui/theme';

export default function SeasonStandingsScreen({ navigation }) {
  const { state, dispatch } = useGame();
  const playedOutcomes = Object.values(state.outcomes);
  const standings = aggregateStandings(playedOutcomes);
  const isLast = state.currentIndex >= state.season.length - 1;

  function next() {
    if (isLast) {
      dispatch({ type: 'RESET' });
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } else {
      dispatch({ type: 'ADVANCE' });
      navigation.reset({ index: 0, routes: [{ name: 'Briefing' }] });
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Classement saison</Text>
      <Text style={styles.sub}>Après {playedOutcomes.length} / {state.season.length} manches</Text>
      <FlatList
        data={standings}
        keyExtractor={(s) => s.entrantId}
        renderItem={({ item, index }) => (
          <View style={[styles.row, item.isPlayer && styles.playerRow]}>
            <Text style={styles.rank}>{index + 1}</Text>
            <Text style={styles.name}>{item.name}{item.isPlayer ? ' (toi)' : ''}</Text>
            <Text style={styles.score}>{item.score.toFixed(0)}</Text>
          </View>
        )}
      />
      <Pressable onPress={next} style={styles.cta} accessibilityRole="button">
        <Text style={styles.ctaText}>{isLast ? 'Terminer la saison' : 'Manche suivante'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: space.md },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  sub: { color: colors.muted, marginBottom: space.md },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.sm, padding: space.md, marginVertical: 2, borderWidth: 1, borderColor: colors.border, gap: space.sm },
  playerRow: { borderColor: colors.primary, borderWidth: 2 },
  rank: { width: 28, fontWeight: '700', color: colors.muted },
  name: { flex: 1, color: colors.text }, score: { fontWeight: '800', color: colors.primary },
  cta: { backgroundColor: colors.good, padding: space.md, borderRadius: radius.md, alignItems: 'center', marginTop: space.sm },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
