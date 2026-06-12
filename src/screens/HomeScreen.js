import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, StyleSheet } from 'react-native';
import { useGame } from '../state/GameContext';
import { SEASON } from '../data/index';
import { createRivals } from '../engine/bots';
import { colors, space, radius } from '../ui/theme';

export default function HomeScreen({ navigation }) {
  const { dispatch } = useGame();
  const [name, setName] = useState('');

  function start() {
    const pseudo = name.trim() || 'Joueur';
    dispatch({ type: 'START_SEASON', payload: { name: pseudo, season: SEASON, rivals: createRivals() } });
    navigation.navigate('Briefing');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Compose ton équipe. Découvre les outsiders. Domine la saison.</Text>
      <Text style={styles.label}>Pseudo</Text>
      <TextInput value={name} onChangeText={setName} placeholder="Ton pseudo" style={styles.input} />
      <Text style={styles.label}>Calendrier de la saison</Text>
      <FlatList
        data={SEASON}
        keyExtractor={(e) => e.id}
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            <Text style={styles.round}>Manche {item.round || index + 1}</Text>
            <Text style={styles.event}>{item.venue} · {item.country}</Text>
          </View>
        )}
        style={{ alignSelf: 'stretch' }}
      />
      <Pressable accessibilityRole="button" onPress={start} style={styles.cta}>
        <Text style={styles.ctaText}>Commencer la saison</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: space.lg, gap: space.sm },
  h1: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: space.md },
  label: { fontSize: 13, color: colors.muted, marginTop: space.md },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: space.md, fontSize: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: radius.sm, padding: space.md, marginVertical: space.xs, borderWidth: 1, borderColor: colors.border },
  round: { fontWeight: '700', color: colors.text },
  event: { color: colors.muted },
  cta: { backgroundColor: colors.primary, padding: space.md, borderRadius: radius.md, alignItems: 'center', marginTop: space.md },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
