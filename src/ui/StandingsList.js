import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { colors, space, radius } from './theme';

export default function StandingsList({ standings }) {
  const { t } = useTranslation();
  return (
    <FlatList
      data={standings}
      keyExtractor={(s) => s.entrantId}
      renderItem={({ item, index }) => (
        <View style={[styles.row, item.isPlayer && styles.playerRow]}>
          <Text style={styles.rank}>{index + 1}</Text>
          <Text style={styles.name}>
            {item.name}
            {item.isPlayer ? ` ${t('results.you')}` : ''}
          </Text>
          <Text style={styles.score}>{item.score.toFixed(0)}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: space.md,
    marginVertical: 2,
    borderWidth: 1,
    borderColor: colors.border,
    gap: space.sm,
  },
  playerRow: { borderColor: colors.primary, borderWidth: 2 },
  rank: { width: 28, fontWeight: '700', color: colors.muted },
  name: { flex: 1, color: colors.text },
  score: { fontWeight: '800', color: colors.primary },
});
