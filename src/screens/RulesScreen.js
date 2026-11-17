import React, { useState } from 'react';
import { ScrollView, View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useGame, useNow, initialState } from '../state/GameContext';
import { BALANCE } from '../data/index';
import { confirm } from '../ui/confirm';
import { colors, space, radius } from '../ui/theme';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function RulesScreen() {
  const { state, dispatch } = useGame();
  const now = useNow();
  const [name, setName] = useState(state.player.name);
  const [date, setDate] = useState(state.simulatedDate || '');

  function saveName() {
    dispatch({ type: 'SET_NAME', payload: { name: name.trim() || 'Joueur' } });
  }

  async function reset() {
    if (!(await confirm('Réinitialiser la partie ? Tes équipes seront remplacées par les données de démo.'))) return;
    dispatch({ type: 'RESET' });
    setName(initialState.player.name);
    setDate('');
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.h2}>Règles</Text>
      <Text style={styles.p}>
        • Compose une équipe de 6 pilotes : Senior 26", Junior 26", Senior 20", Junior 20" et 2 Elite Femme 20"
        différentes.
      </Text>
      <Text style={styles.p}>• Points d'un pilote = points de classement (100 pour le 1er, 80, 65…) × sa cote.</Text>
      <Text style={styles.p}>• Une cote élevée signale un outsider : s'il finit bien, il rapporte gros.</Text>
      <Text style={styles.p}>
        • L'équipe est modifiable jusqu'au jour de la manche, puis verrouillée. Les résultats sont révélés à la fin de
        la manche.
      </Text>

      <Text style={styles.h2}>Cartes et collection</Text>
      <Text style={styles.p}>
        • Tu ne joues que les cartes que tu possèdes. Elles se réutilisent d'une manche à l'autre.
      </Text>
      <Text style={styles.p}>
        • 4 types : pilote, technique (attachée à un pilote), équipement ({BALANCE.slots.equipment} par équipe), arbitre
        (1 par équipe).
      </Text>
      <Text style={styles.p}>
        • 4 raretés : Commune, Rare, Épique, Légendaire. Plus la carte est rare, plus son effet rapporte et plus son
        pilote peut porter de techniques.
      </Text>
      <Text style={styles.p}>
        • Un pack gratuit par jour : {BALANCE.pack.size} cartes dont au moins une Rare. Une Épique est garantie au moins
        tous les {BALANCE.pity.E} packs, une Légendaire tous les {BALANCE.pity.L}.
      </Text>
      <Text style={styles.p}>
        • Les doublons se recyclent en fragments, qui servent à fabriquer la carte de ton choix.
      </Text>

      <Text style={styles.h2}>Profil</Text>
      <Text style={styles.p}>Pseudo actuel : {state.player.name}</Text>
      <TextInput value={name} onChangeText={setName} style={styles.input} />
      <Pressable onPress={saveName} style={styles.btn} accessibilityRole="button">
        <Text style={styles.btnText}>Enregistrer le pseudo</Text>
      </Pressable>

      <Text style={styles.h2}>Date simulée</Text>
      <Text style={styles.p}>
        Date du jeu : {now}
        {state.simulatedDate ? ' (simulée)' : ''}
      </Text>
      <TextInput value={date} onChangeText={setDate} placeholder="AAAA-MM-JJ" style={styles.input} />
      <View style={styles.rowBtns}>
        <Pressable
          disabled={!DATE_RE.test(date)}
          onPress={() => dispatch({ type: 'SET_SIMULATED_DATE', payload: { date } })}
          style={[styles.btn, styles.flex, !DATE_RE.test(date) && styles.disabled]}
          accessibilityRole="button"
        >
          <Text style={styles.btnText}>Appliquer</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            dispatch({ type: 'SET_SIMULATED_DATE', payload: { date: null } });
            setDate('');
          }}
          style={[styles.btn, styles.flex, styles.secondary]}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryText}>Revenir à aujourd'hui</Text>
        </Pressable>
      </View>

      <Pressable onPress={reset} style={[styles.btn, styles.danger]} accessibilityRole="button">
        <Text style={styles.btnText}>Réinitialiser la partie</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.md, gap: space.sm },
  h2: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: space.md },
  p: { color: colors.text, lineHeight: 20 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: space.md,
    fontSize: 16,
  },
  rowBtns: { flexDirection: 'row', gap: space.sm },
  flex: { flex: 1 },
  btn: { backgroundColor: colors.primary, padding: space.md, borderRadius: radius.md, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  secondaryText: { color: colors.text, fontWeight: '700' },
  disabled: { opacity: 0.4 },
  danger: { backgroundColor: '#DC2626', marginTop: space.lg },
});
