import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, Pressable, StyleSheet } from 'react-native';
import { colors, rarityColors, space, radius } from './theme';

export const TYPE_GLYPHS = { PILOT: '🏍️', TECHNIQUE: '🤸', EQUIPMENT: '🛠️', REFEREE: '🏁' };

// count: undefined = do not show; 0 = missing (greyed). label overrides the accessibility label.
export default function CardTile({ card, rarity, count, badge, label, onPress }) {
  const { t } = useTranslation();
  const missing = count === 0;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={label || `${card.name} ${t(`rarity.${rarity}`)}`}
      style={[styles.tile, { borderColor: rarityColors[rarity] }, missing && styles.missing]}
    >
      <Text style={styles.glyph}>{TYPE_GLYPHS[card.type]}</Text>
      <Text style={styles.name} numberOfLines={2}>
        {card.name}
      </Text>
      <Text style={[styles.rarity, { color: rarityColors[rarity] }]}>{t(`rarity.${rarity}`)}</Text>
      {count !== undefined && <Text style={styles.count}>{missing ? 'Manquante' : `×${count}`}</Text>}
      {badge ? <Text style={styles.badge}>{badge}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    margin: space.xs,
    minHeight: 120,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 2,
    padding: space.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missing: { opacity: 0.35 },
  glyph: { fontSize: 24 },
  name: { fontSize: 12, fontWeight: '700', color: colors.text, textAlign: 'center', marginTop: space.xs },
  rarity: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  count: { fontSize: 11, color: colors.muted, marginTop: 2 },
  badge: { fontSize: 11, fontWeight: '800', color: colors.good, marginTop: 2 },
});
