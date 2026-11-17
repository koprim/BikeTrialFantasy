import React, { useState } from 'react';
import { ScrollView, View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useGame, useNow } from '../state/GameContext';
import { BALANCE } from '../data/index';
import { confirm } from '../ui/confirm';
import { errorMessage } from '../ui/errorMessages';
import { useAsyncAction } from '../ui/useAsyncAction';
import { colors, space, radius } from '../ui/theme';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function RulesScreen({ navigation }) {
  const { state, actions, features } = useGame();
  const now = useNow();
  const [name, setName] = useState(state.player.name);
  const [date, setDate] = useState(state.simulatedDate || '');
  const [error, setError] = useState(null);

  // Runs one action at a time and resolves its ApiResult (undefined if ignored); a refusal shows the reason.
  const { run, busy } = useAsyncAction(async (call) => {
    setError(null);
    const result = await call();
    if (!result.ok) setError(errorMessage(result.error, result.details));
    return result;
  });

  const saveName = () => run(() => actions.setName(name.trim() || 'Joueur'));
  const applyDate = () => run(() => actions.setSimulatedDate(date));

  async function clearDate() {
    const result = await run(() => actions.setSimulatedDate(null));
    if (result?.ok) setDate('');
  }

  async function reset() {
    if (!(await confirm('Réinitialiser la partie ? Tes équipes seront remplacées par les données de démo.'))) return;
    const result = await run(actions.reset);
    if (!result?.ok) return;
    setName(result.patch.player.name); // reset's patch is the full new PlayerState
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
      <Pressable
        disabled={busy}
        onPress={saveName}
        style={[styles.btn, busy && styles.disabled]}
        accessibilityRole="button"
        accessibilityState={{ busy, disabled: busy }}
      >
        <Text style={styles.btnText}>Enregistrer le pseudo</Text>
      </Pressable>
      {error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      {features.account && (
        <Pressable
          onPress={() => navigation.navigate('Account')}
          style={[styles.btn, styles.secondary]}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryText}>Sauvegarder mon compte</Text>
        </Pressable>
      )}

      {features.simulatedDate && (
        <SimulatedDate
          now={now}
          simulated={!!state.simulatedDate}
          date={date}
          onChange={setDate}
          onApply={applyDate}
          onClear={clearDate}
          busy={busy}
        />
      )}

      {features.reset && (
        <Pressable
          disabled={busy}
          onPress={reset}
          style={[styles.btn, styles.danger, busy && styles.disabled]}
          accessibilityRole="button"
          accessibilityState={{ busy, disabled: busy }}
        >
          <Text style={styles.btnText}>Réinitialiser la partie</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function SimulatedDate({ now, simulated, date, onChange, onApply, onClear, busy }) {
  const applyDisabled = busy || !DATE_RE.test(date);
  return (
    <>
      <Text style={styles.h2}>Date simulée</Text>
      <Text style={styles.p}>
        Date du jeu : {now}
        {simulated ? ' (simulée)' : ''}
      </Text>
      <TextInput value={date} onChangeText={onChange} placeholder="AAAA-MM-JJ" style={styles.input} />
      <View style={styles.rowBtns}>
        <Pressable
          disabled={applyDisabled}
          onPress={onApply}
          style={[styles.btn, styles.flex, applyDisabled && styles.disabled]}
          accessibilityRole="button"
          accessibilityState={{ busy, disabled: applyDisabled }}
        >
          <Text style={styles.btnText}>Appliquer</Text>
        </Pressable>
        <Pressable
          disabled={busy}
          onPress={onClear}
          style={[styles.btn, styles.flex, styles.secondary, busy && styles.disabled]}
          accessibilityRole="button"
          accessibilityState={{ busy, disabled: busy }}
        >
          <Text style={styles.secondaryText}>Revenir à aujourd'hui</Text>
        </Pressable>
      </View>
    </>
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
  error: { color: '#DC2626' },
  danger: { backgroundColor: '#DC2626', marginTop: space.lg },
});
