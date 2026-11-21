import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet } from 'react-native';
import { useScoring } from '../state/GameContext';
import { SEASONS } from '../data/index';
import { currentSeason } from '../engine/calendar';
import { seasonSummary } from '../state/selectors';
import StandingsList from '../ui/StandingsList';
import { colors, space } from '../ui/theme';
import { useGameText } from '../i18n/useGameText';

export default function StandingsScreen() {
  const { t } = useTranslation();
  const text = useGameText();
  const ctx = useScoring();
  const season = currentSeason(SEASONS, ctx.now);
  const summary = seasonSummary({ season, ...ctx });
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{text.seasonName(season.id)}</Text>
      <Text style={styles.sub}>{t('standings.after', { played: summary.played, total: season.events.length })}</Text>
      {summary.played ? (
        <StandingsList standings={summary.standings} />
      ) : (
        <Text style={styles.sub}>{t('standings.none')}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: space.md },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  sub: { color: colors.muted, marginBottom: space.md },
});
