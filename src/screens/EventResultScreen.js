import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useGame, useScoring } from '../state/GameContext';
import { EVENTS_BY_ID, RIDERS_BY_ID } from '../data/index';
import { SLOTS } from '../engine/team';
import { eventOutcome } from '../state/selectors';
import OutcomeView from '../ui/OutcomeView';
import { colors, space, radius } from '../ui/theme';

export default function EventResultScreen({ route }) {
  const { state } = useGame();
  const ctx = useScoring();
  const event = EVENTS_BY_ID[route.params.eventId];
  const outcome = eventOutcome({ event, ...ctx });

  if (outcome) {
    return <View style={styles.container}><OutcomeView event={event} outcome={outcome} /></View>;
  }

  // Live event: team is locked, results not revealed yet.
  const team = state.picks[event.id];
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{event.name}</Text>
      <Text style={styles.sub}>Résultats après le {event.dateTo || event.dateFrom}</Text>
      {team ? SLOTS.map((slot) => (
        <View key={slot.id} style={styles.row}>
          <Text style={styles.label}>{slot.label}</Text>
          <Text style={styles.rider}>{RIDERS_BY_ID[team[slot.id]]?.name ?? '—'}</Text>
        </View>
      )) : <Text style={styles.sub}>Aucune équipe enregistrée</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: space.md },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  sub: { color: colors.muted, marginVertical: space.sm },
  row: { backgroundColor: colors.surface, borderRadius: radius.sm, padding: space.sm, marginVertical: 2, borderWidth: 1, borderColor: colors.border },
  label: { fontSize: 12, color: colors.muted },
  rider: { color: colors.text, fontWeight: '600' },
});
