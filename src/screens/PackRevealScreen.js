import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import { useGame } from '../state/GameContext';
import { CARDS_BY_ID } from '../data/index';
import CardTile from '../ui/CardTile';
import { colors, space, radius } from '../ui/theme';
import { useGameText } from '../i18n/useGameText';

export default function PackRevealScreen({ navigation, route }) {
  const { t } = useTranslation();
  const text = useGameText();
  const { state } = useGame();
  const cards = state.collection.lastPack;
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{route.params?.title || 'Pack'}</Text>
      <FlatList
        data={cards}
        numColumns={3}
        keyExtractor={(c, i) => `${c.cardId}:${c.rarity}:${i}`}
        renderItem={({ item }) => {
          const card = CARDS_BY_ID[item.cardId];
          return (
            <CardTile
              card={card}
              rarity={item.rarity}
              badge={item.isNew ? 'Nouvelle !' : 'Doublon'}
              label={`Carte révélée ${text.cardName(card.id)} ${t(`rarity.${item.rarity}`)}`}
            />
          );
        }}
      />
      <Pressable style={styles.cta} accessibilityRole="button" onPress={() => navigation.goBack()}>
        <Text style={styles.ctaText}>Voir ma collection</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: space.md },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: space.md },
  cta: {
    backgroundColor: colors.primary,
    padding: space.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: space.sm,
  },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
