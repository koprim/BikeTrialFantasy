import React from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useScoring } from '../state/GameContext';
import { SEASONS } from '../data/index';
import { seasonStatus } from '../engine/calendar';
import { seasonSummary } from '../state/selectors';
import { colors, space, radius } from '../ui/theme';

export default function SeasonListScreen({ navigation }) {
  const ctx = useScoring();
  // SEASONS is chronological; show the newest first and hide seasons not started yet.
  const seasons = SEASONS.filter((s) => seasonStatus(s, ctx.now) !== 'upcoming')
    .slice()
    .reverse();
  return (
    <View style={styles.container}>
      <FlatList
        data={seasons}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => {
          const summary = seasonSummary({ season: item, ...ctx });
          const status = seasonStatus(item, ctx.now) === 'current' ? 'En cours' : 'Archivée';
          return (
            <Pressable
              onPress={() => navigation.navigate('SeasonDetail', { seasonId: item.id })}
              style={styles.row}
              accessibilityRole="button"
            >
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {status} · {summary.rank ? `#${summary.rank}` : '—'} · {summary.score.toFixed(0)} pts
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: space.md },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: space.md,
    marginVertical: space.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: { fontWeight: '700', color: colors.text },
  meta: { color: colors.muted, marginTop: 2 },
});
