import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { useGame } from '../state/GameContext';
import { CARDS_BY_ID, RIDERS_BY_ID, BALANCE } from '../data/index';
import { countOf } from '../engine/collection';
import { formatValue } from '../engine/effects';
import { TYPE_GLYPHS } from '../ui/CardTile';
import { confirm } from '../ui/confirm';
import { errorMessage } from '../ui/errorMessages';
import { useAsyncAction } from '../ui/useAsyncAction';
import { colors, rarityColors, space, radius } from '../ui/theme';
import { useGameText } from '../i18n/useGameText';

export default function CardDetailScreen({ route }) {
  const { t } = useTranslation();
  const text = useGameText();
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
    if (!result.ok) setError({ code: result.error });
  });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.glyph}>{TYPE_GLYPHS[card.type]}</Text>
      <Text style={styles.title}>{text.cardName(card.id)}</Text>
      <Text style={styles.sub}>
        {t(`cardDetail.types.${card.type}`)} · {t('cardDetail.edition', { edition: card.edition })}
        {rider
          ? ` · ${rider.country} · ${rider.active === false ? t('cardDetail.legend') : t('cardDetail.cote', { value: rider.cote.toFixed(1) })}`
          : ''}
      </Text>
      <Text style={styles.sub}>{t('cardDetail.fragments', { count: fragments })}</Text>
      {error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {errorMessage(error.code)}
        </Text>
      )}

      {card.rarities.map((r) => {
        const count = countOf(state.collection, card.id, r);
        const cost = BALANCE.fragments.craftCost[r];
        const gain = BALANCE.fragments.perDuplicate[r];
        const rarityLabel = t(`rarity.${r}`);
        const label = `${text.cardName(card.id)} (${rarityLabel})`;
        const canCraft = fragments >= cost;
        const craftDisabled = busy || !canCraft;
        return (
          <View key={r} style={[styles.row, { borderColor: rarityColors[r] }]}>
            <Text style={[styles.rarity, { color: rarityColors[r] }]}>
              {rarityLabel} · ×{count}
            </Text>
            {card.effects.map((e, i) => (
              <Text key={i} style={styles.effect}>
                {text.effectText(card.id, i, formatValue(e.reward, r, BALANCE))}
              </Text>
            ))}
            <View style={styles.actions}>
              <Pressable
                disabled={craftDisabled}
                accessibilityRole="button"
                accessibilityState={{ busy, disabled: craftDisabled }}
                accessibilityLabel={t(canCraft ? 'cardDetail.craftA11y' : 'cardDetail.craftUnavailableA11y', {
                  name: text.cardName(card.id),
                  rarity: rarityLabel,
                })}
                onPress={() => run(actions.craft, r, t('cardDetail.craftConfirm', { label, cost }))}
                style={[styles.btn, craftDisabled && styles.disabled]}
              >
                <Text style={styles.btnText}>{t('cardDetail.craft', { cost })}</Text>
              </Pressable>
              {count > 1 && (
                <Pressable
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityState={{ busy, disabled: busy }}
                  accessibilityLabel={t('cardDetail.recycleA11y', {
                    name: text.cardName(card.id),
                    rarity: rarityLabel,
                  })}
                  onPress={() => run(actions.recycle, r, t('cardDetail.recycleConfirm', { label, gain }))}
                  style={[styles.btn, styles.secondary, busy && styles.disabled]}
                >
                  <Text style={styles.secondaryText}>{t('cardDetail.recycle', { gain })}</Text>
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
