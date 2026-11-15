import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useScoring } from '../state/GameContext';
import { SEASONS } from '../data/index';
import { currentSeason } from '../engine/calendar';
import { seasonSummary } from '../state/selectors';
import StandingsList from '../ui/StandingsList';
import { colors, space } from '../ui/theme';

export default function StandingsScreen() {
  const ctx = useScoring();
  const season = currentSeason(SEASONS, ctx.now);
  const summary = seasonSummary({ season, ...ctx });
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{season.name}</Text>
      <Text style={styles.sub}>Après {summary.played} / {season.events.length} manches</Text>
      {summary.played
        ? <StandingsList standings={summary.standings} />
        : <Text style={styles.sub}>Aucune manche terminée pour l'instant</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: space.md },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  sub: { color: colors.muted, marginBottom: space.md },
});
