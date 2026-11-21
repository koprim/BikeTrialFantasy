import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, SectionList, Pressable, StyleSheet } from 'react-native';
import { ridersByCategory, EVENTS_BY_ID } from '../data/index';
import { SLOTS } from '../engine/team';
import { colors, space, radius } from '../ui/theme';
import { useGameText } from '../i18n/useGameText';

export default function BriefingScreen({ navigation, route }) {
  const { t } = useTranslation();
  const text = useGameText();
  const event = EVENTS_BY_ID[route.params.eventId];
  const byCat = ridersByCategory();
  const categories = [...new Set(SLOTS.map((s) => s.category))];
  const sections = categories.map((c) => ({
    title: t(`briefing.categories.${c}`),
    data: [...byCat[c]].sort((a, b) => a.uciRank - b.uciRank),
  }));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{text.eventName(event.id)}</Text>
        <Text style={styles.sub}>
          {t('briefing.roundHeader', {
            round: event.round,
            venue: event.venue,
            country: event.country,
            date: event.dateFrom,
          })}
        </Text>
        <Text style={styles.sub}>{t('briefing.lockedOn', { date: event.dateFrom })}</Text>
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
      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.navigate('Compose', { eventId: event.id })}
        style={styles.cta}
      >
        <Text style={styles.ctaText}>{t('briefing.compose')}</Text>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: space.sm,
    marginVertical: 2,
    borderWidth: 1,
    borderColor: colors.border,
    gap: space.sm,
  },
  rank: { width: 40, color: colors.muted },
  name: { flex: 1, color: colors.text },
  country: { width: 44, color: colors.muted },
  cote: { width: 44, textAlign: 'right', fontWeight: '700', color: colors.primary },
  cta: {
    backgroundColor: colors.primary,
    padding: space.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: space.sm,
  },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
