import React from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useScoring } from '../state/GameContext';
import { SEASONS } from '../data/index';
import { eventStatus } from '../engine/calendar';
import { eventLabel } from '../ui/eventLabel';
import { colors, space, radius } from '../ui/theme';

export default function SeasonDetailScreen({ navigation, route }) {
  const ctx = useScoring();
  const season = SEASONS.find((s) => s.id === route.params.seasonId);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{season.name}</Text>
      <FlatList
        data={season.events}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => {
          const isOpen = eventStatus(item, ctx.now) === 'open';
          return (
            <Pressable
              disabled={isOpen}
              onPress={() => navigation.navigate('EventResult', { eventId: item.id })}
              style={styles.row}
              accessibilityRole="button"
            >
              <Text style={styles.round}>
                Manche {item.round} · {item.venue}
              </Text>
              <Text style={styles.status}>{eventLabel(item, ctx)}</Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: space.md },
  title: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: space.sm },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: space.md,
    marginVertical: space.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  round: { fontWeight: '700', color: colors.text },
  status: { color: colors.primary, fontWeight: '600' },
});
