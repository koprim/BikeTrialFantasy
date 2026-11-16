import React from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { useGame } from '../state/GameContext';
import { CARDS_BY_ID, RIDERS_BY_ID, BALANCE } from '../data/index';
import { countOf } from '../engine/collection';
import { describeEffect } from '../engine/effects';
import { RARITY_LABELS } from '../engine/rarity';
import { TYPE_GLYPHS } from '../ui/CardTile';
import { colors, rarityColors, space, radius } from '../ui/theme';

const TYPE_LABELS = { PILOT: 'Pilote', TECHNIQUE: 'Technique', EQUIPMENT: 'Équipement', REFEREE: 'Arbitre' };

export default function CardDetailScreen({ route }) {
  const { state, dispatch } = useGame();
  const card = CARDS_BY_ID[route.params.cardId];
  const rider = card.type === 'PILOT' ? RIDERS_BY_ID[card.subject] : null;
  const { fragments } = state.collection;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.glyph}>{TYPE_GLYPHS[card.type]}</Text>
      <Text style={styles.title}>{card.name}</Text>
      <Text style={styles.sub}>
        {TYPE_LABELS[card.type]} · édition {card.edition}
        {rider ? ` · ${rider.country} · ${rider.active === false ? 'légende' : `cote ×${rider.cote.toFixed(1)}`}` : ''}
      </Text>
      <Text style={styles.sub}>Fragments : {fragments}</Text>

      {card.rarities.map((r) => {
        const count = countOf(state.collection, card.id, r);
        const cost = BALANCE.fragments.craftCost[r];
        const canCraft = fragments >= cost;
        return (
          <View key={r} style={[styles.row, { borderColor: rarityColors[r] }]}>
            <Text style={[styles.rarity, { color: rarityColors[r] }]}>{RARITY_LABELS[r]} · ×{count}</Text>
            {card.effects.map((e, i) => <Text key={i} style={styles.effect}>{describeEffect(e, r, BALANCE)}</Text>)}
            <View style={styles.actions}>
              <Pressable disabled={!canCraft} accessibilityRole="button"
                accessibilityLabel={`Fabriquer ${card.name} ${RARITY_LABELS[r]}${canCraft ? '' : ' indisponible'}`}
                onPress={() => dispatch({ type: 'CRAFT', payload: { cardId: card.id, rarity: r } })}
                style={[styles.btn, !canCraft && styles.disabled]}>
                <Text style={styles.btnText}>Fabriquer · {cost} fragments</Text>
              </Pressable>
              {count > 1 && (
                <Pressable accessibilityRole="button" accessibilityLabel={`Recycler ${card.name} ${RARITY_LABELS[r]}`}
                  onPress={() => dispatch({ type: 'RECYCLE', payload: { cardId: card.id, rarity: r } })}
                  style={[styles.btn, styles.secondary]}>
                  <Text style={styles.secondaryText}>Recycler · +{BALANCE.fragments.perDuplicate[r]}</Text>
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
});
