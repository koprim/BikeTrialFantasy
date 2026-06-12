import React from 'react';
import { View, Text, SectionList, Pressable, StyleSheet } from 'react-native';
import { useGame } from '../state/GameContext';
import { ridersByCategory } from '../data/index';
import { SLOTS } from '../engine/team';
import { colors, space, radius } from '../ui/theme';

const CATEGORY_LABEL = {
  SENIOR_26: 'Senior 26"', JUNIOR_26: 'Junior 26"', SENIOR_20: 'Senior 20"',
  JUNIOR_20: 'Junior 20"', ELITE_WOMEN: 'Elite Femme 20"',
};

export default function BriefingScreen({ navigation }) {
  const { state } = useGame();
  const event = state.season[state.currentIndex];
  const byCat = ridersByCategory();
  const categories = [...new Set(SLOTS.map((s) => s.category))];
  const sections = categories.map((c) => ({
    title: CATEGORY_LABEL[c],
    data: [...byCat[c]].sort((a, b) => a.uciRank - b.uciRank),
  }));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{event.name}</Text>
        <Text style={styles.sub}>Manche {event.round} · {event.venue} ({event.country}) · {event.dateFrom}</Text>
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => <Text style={styles.section}>{section.title}</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rank}>#{item.uciRank}</Text>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.country}>{item.country}</Text>
            <Text style={styles.cote}>×{item.cote.toFixed(1)}</Text>
          </View>
        )}
        stickySectionHeadersEnabled={false}
      />
      <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Compose')} style={styles.cta}>
        <Text style={styles.ctaText}>Composer mon équipe</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: space.md },
  header: { marginBottom: space.md },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  sub: { color: colors.muted, marginTop: space.xs },
  section: { fontWeight: '700', color: colors.accent, marginTop: space.md, marginBottom: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.sm, padding: space.sm, marginVertical: 2, borderWidth: 1, borderColor: colors.border, gap: space.sm },
  rank: { width: 40, color: colors.muted },
  name: { flex: 1, color: colors.text },
  country: { width: 44, color: colors.muted },
  cote: { width: 44, textAlign: 'right', fontWeight: '700', color: colors.primary },
  cta: { backgroundColor: colors.primary, padding: space.md, borderRadius: radius.md, alignItems: 'center', marginTop: space.sm },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
