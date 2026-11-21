import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import { useGame, useNow } from '../state/GameContext';
import { CARDS } from '../data/index';
import { canOpenDaily, countOf } from '../engine/collection';
import { RARITIES } from '../engine/rarity';
import CardTile from '../ui/CardTile';
import { errorMessage } from '../ui/errorMessages';
import { useAsyncAction } from '../ui/useAsyncAction';
import { colors, space, radius } from '../ui/theme';

const TYPE_FILTER_KEYS = ['ALL', 'PILOT', 'TECHNIQUE', 'EQUIPMENT', 'REFEREE'];

function Chips({ options, value, onChange }) {
  return (
    <View style={styles.chips}>
      {options.map(([key, label]) => (
        <Pressable
          key={key}
          onPress={() => onChange(key)}
          accessibilityRole="button"
          accessibilityState={{ selected: value === key }}
          style={[styles.chip, value === key && styles.chipOn]}
        >
          <Text style={[styles.chipText, value === key && styles.chipTextOn]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function CollectionScreen({ navigation }) {
  const { t } = useTranslation();
  const { state, actions } = useGame();
  const now = useNow();
  const typeFilters = TYPE_FILTER_KEYS.map((key) => [key, t(`collection.types.${key}`)]);
  const rarityFilters = [['ALL', t('collection.allRarities')], ...RARITIES.map((r) => [r, t(`rarity.${r}`)])];
  const [type, setType] = useState('ALL');
  const [rarity, setRarity] = useState('ALL');
  const [error, setError] = useState(null);
  const { collection } = state;

  const items = CARDS.filter((c) => type === 'ALL' || c.type === type).flatMap((c) =>
    c.rarities
      .filter((r) => rarity === 'ALL' || r === rarity)
      .map((r) => ({ key: `${c.id}:${r}`, card: c, rarity: r, count: countOf(collection, c.id, r) })),
  );
  const owned = items.filter((i) => i.count > 0).length;
  const daily = canOpenDaily(collection, now);

  // Reveal the pack only once the backend has opened it.
  const { run: open, busy } = useAsyncAction(async (call, title) => {
    setError(null);
    const result = await call();
    if (result.ok) navigation.navigate('PackReveal', { title });
    else setError(errorMessage(result.error));
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.stat}>{t('collection.owned', { owned, total: items.length })}</Text>
        <Text style={styles.stat}>{t('collection.fragments', { count: collection.fragments })}</Text>
      </View>
      {!collection.starterGiven && (
        <Pressable
          disabled={busy}
          style={[styles.cta, styles.starter, busy && styles.disabled]}
          accessibilityRole="button"
          accessibilityState={{ busy, disabled: busy }}
          onPress={() => open(actions.openStarter, t('collection.starterTitle'))}
        >
          <Text style={styles.ctaText}>{t('collection.openStarter')}</Text>
        </Pressable>
      )}
      <Pressable
        disabled={busy || !daily}
        style={[styles.cta, (busy || !daily) && styles.disabled]}
        accessibilityRole="button"
        accessibilityState={{ busy, disabled: busy || !daily }}
        onPress={() => open(() => actions.openDailyPack({ now }), t('collection.dailyTitle'))}
      >
        <Text style={styles.ctaText}>{daily ? t('collection.openDaily') : t('collection.nextDaily')}</Text>
      </Pressable>
      {error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      <Chips options={typeFilters} value={type} onChange={setType} />
      <Chips options={rarityFilters} value={rarity} onChange={setRarity} />
      <FlatList
        data={items}
        numColumns={3}
        keyExtractor={(i) => i.key}
        renderItem={({ item }) => (
          <CardTile
            card={item.card}
            rarity={item.rarity}
            count={item.count}
            onPress={() => navigation.navigate('CardDetail', { cardId: item.card.id })}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: space.sm },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: space.xs,
    marginBottom: space.sm,
  },
  stat: { color: colors.muted, fontWeight: '600' },
  cta: {
    backgroundColor: colors.primary,
    padding: space.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginBottom: space.sm,
  },
  starter: { backgroundColor: colors.good },
  disabled: { opacity: 0.4 },
  error: { color: '#DC2626', marginBottom: space.sm, textAlign: 'center' },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginBottom: space.xs },
  chip: {
    paddingVertical: 4,
    paddingHorizontal: space.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 12 },
  chipTextOn: { color: '#fff', fontWeight: '700' },
});
