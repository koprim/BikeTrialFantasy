import React, { useState } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { useGame } from '../state/GameContext';
import { CARDS_BY_ID, RIDERS_BY_ID, BALANCE } from '../data/index';
import { countOf } from '../engine/collection';
import { describeEffect } from '../engine/effects';
import { RARITY_LABELS } from '../engine/rarity';
import { TYPE_GLYPHS } from '../ui/CardTile';
import { confirm } from '../ui/confirm';
import { errorMessage } from '../ui/errorMessages';
import { useAsyncAction } from '../ui/useAsyncAction';
import { colors, rarityColors, space, radius } from '../ui/theme';

const TYPE_LABELS = { PILOT: 'Pilote', TECHNIQUE: 'Technique', EQUIPMENT: 'Équipement', REFEREE: 'Arbitre' };

export default function CardDetailScreen({ route }) {
  const { state, actions } = useGame();
  const [error, setError] = useState(null);
  const card = CARDS_BY_ID[route.params.cardId];
  const rider = card.type === 'PILOT' ? RIDERS_BY_ID[card.subject] : null;
  const { fragments } = state.collection;

  // Both actions spend something (a card or fragments) and cannot be undone, so they ask first.
  const { run, busy } = useAsyncAction(async (call, rarity, question) => {
    if (!(await confirm(question))) return;
    setError(null);
    const result = await call({ cardId: card.id, rarity });
    if (!result.ok) setError(errorMessage(result.error));
  });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.glyph}>{TYPE_GLYPHS[card.type]}</Text>
      <Text style={styles.title}>{card.name}</Text>
      <Text style={styles.sub}>
        {TYPE_LABELS[card.type]} · édition {card.edition}
        {rider ? ` · ${rider.country} · ${rider.active === false ? 'légende' : `cote ×${rider.cote.toFixed(1)}`}` : ''}
      </Text>
      <Text style={styles.sub}>Fragments : {fragments}</Text>
      {error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}

      {card.rarities.map((r) => {
        const count = countOf(state.collection, card.id, r);
        const cost = BALANCE.fragments.craftCost[r];
        const gain = BALANCE.fragments.perDuplicate[r];
        const label = `${card.name} (${RARITY_LABELS[r]})`;
        const canCraft = fragments >= cost;
        const craftDisabled = busy || !canCraft;
        return (
          <View key={r} style={[styles.row, { borderColor: rarityColors[r] }]}>
            <Text style={[styles.rarity, { color: rarityColors[r] }]}>
              {RARITY_LABELS[r]} · ×{count}
            </Text>
            {card.effects.map((e, i) => (
              <Text key={i} style={styles.effect}>
                {describeEffect(e, r, BALANCE)}
              </Text>
            ))}
            <View style={styles.actions}>
              <Pressable
                disabled={craftDisabled}
                accessibilityRole="button"
                accessibilityState={{ busy, disabled: craftDisabled }}
                accessibilityLabel={`Fabriquer ${card.name} ${RARITY_LABELS[r]}${canCraft ? '' : ' indisponible'}`}
                onPress={() => run(actions.craft, r, `Fabriquer ${label} pour ${cost} fragments ?`)}
                style={[styles.btn, craftDisabled && styles.disabled]}
              >
                <Text style={styles.btnText}>Fabriquer · {cost} fragments</Text>
              </Pressable>
              {count > 1 && (
                <Pressable
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityState={{ busy, disabled: busy }}
                  accessibilityLabel={`Recycler ${card.name} ${RARITY_LABELS[r]}`}
                  onPress={() =>
                    run(actions.recycle, r, `Recycler un exemplaire de ${label} contre ${gain} fragments ?`)
                  }
                  style={[styles.btn, styles.secondary, busy && styles.disabled]}
                >
                  <Text style={styles.secondaryText}>Recycler · +{gain}</Text>
                </Pressable>
              )}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.md, gap: space.sm },
  glyph: { fontSize: 40, textAlign: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center' },
  sub: { color: colors.muted, textAlign: 'center' },
  row: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 2, padding: space.md, gap: space.xs },
  rarity: { fontWeight: '800' },
  effect: { color: colors.text },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
  btn: { flex: 1, backgroundColor: colors.primary, padding: space.sm, borderRadius: radius.sm, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  secondaryText: { color: colors.text, fontWeight: '700', fontSize: 12 },
  disabled: { opacity: 0.4 },
  error: { color: '#DC2626', textAlign: 'center' },
});
