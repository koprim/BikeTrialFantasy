import React from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useGame, useScoring } from '../state/GameContext';
import { SEASONS } from '../data/index';
import { currentSeason, eventStatus } from '../engine/calendar';
import { seasonSummary } from '../state/selectors';
import { eventLabel } from '../ui/eventLabel';
import { colors, space, radius } from '../ui/theme';

export default function SeasonHomeScreen({ navigation }) {
  const { state } = useGame();
  const ctx = useScoring();
  const season = currentSeason(SEASONS, ctx.now);
  const summary = seasonSummary({ season, ...ctx });

  function open(event) {
    if (eventStatus(event, ctx.now) === 'open') navigation.navigate('Briefing', { eventId: event.id });
    else navigation.navigate('EventResult', { eventId: event.id });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>{season.name}</Text>
      <Text style={styles.sub}>
        {state.player.name} · {summary.score.toFixed(0)} pts{summary.rank ? ` · #${summary.rank}` : ''}
      </Text>
      <FlatList
        data={season.events}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => (
          <Pressable onPress={() => open(item)} style={styles.row} accessibilityRole="button">
            <View style={{ flex: 1 }}>
              <Text style={styles.round}>Manche {item.round} · {item.venue}</Text>
              <Text style={styles.date}>{item.dateFrom} · {item.country}</Text>
            </View>
            <Text style={styles.status}>{eventLabel(item, ctx)}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: space.md, gap: space.sm },
  h1: { fontSize: 22, fontWeight: '800', color: colors.text },
  sub: { color: colors.muted, marginBottom: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.sm, padding: space.md, marginVertical: space.xs, borderWidth: 1, borderColor: colors.border, gap: space.sm },
  round: { fontWeight: '700', color: colors.text },
  date: { color: colors.muted, marginTop: 2 },
  status: { color: colors.primary, fontWeight: '600' },
});
