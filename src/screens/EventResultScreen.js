import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet } from 'react-native';
import { useGame, useScoring } from '../state/GameContext';
import { EVENTS_BY_ID, EDITION } from '../data/index';
import { SLOTS, normalizeTeam } from '../engine/team';
import { eventOutcome } from '../state/selectors';
import OutcomeView from '../ui/OutcomeView';
import { colors, space, radius } from '../ui/theme';
import { useGameText } from '../i18n/useGameText';

export default function EventResultScreen({ route }) {
  const { t } = useTranslation();
  const text = useGameText();
  const { state } = useGame();
  const ctx = useScoring();
  const event = EVENTS_BY_ID[route.params.eventId];
  const outcome = eventOutcome({ event, ...ctx });

  if (outcome) {
    return (
      <View style={styles.container}>
        <OutcomeView event={event} outcome={outcome} />
      </View>
    );
  }

  // Live event: team is locked, results not revealed yet.
  const team = normalizeTeam(state.picks[event.id], EDITION);
  const label = (ref) => `${text.cardName(ref.cardId)} Â· ${t(`rarity.${ref.rarity}`)}`;
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{text.eventName(event.id)}</Text>
      <Text style={styles.sub}>RÃ©sultats aprÃ¨s le {event.dateTo || event.dateFrom}</Text>
      {team ? (
        SLOTS.map((slot) => {
          const entry = team.slots[slot.id];
          return (
            <View key={slot.id} style={styles.row}>
              <Text style={styles.label}>{t(`compose.slots.${slot.id}`)}</Text>
              <Text style={styles.rider}>{entry ? label(entry) : 'â€”'}</Text>
              {entry &&
                entry.techniques.map((technique) => (
                  <Text key={`${technique.cardId}:${technique.rarity}`} style={styles.label}>
                    + {label(technique)}
                  </Text>
                ))}
            </View>
          );
        })
      ) : (
        <Text style={styles.sub}>Aucune Ã©quipe enregistrÃ©e</Text>
      )}
      {team &&
        team.equipment.map((e) => (
          <Text key={`${e.cardId}:${e.rarity}`} style={styles.sub}>
            Ã‰quipement : {label(e)}
          </Text>
        ))}
      {team && team.referee && <Text style={styles.sub}>Arbitre : {label(team.referee)}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: space.md },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  sub: { color: colors.muted, marginVertical: space.sm },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: space.sm,
    marginVertical: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { fontSize: 12, color: colors.muted },
  rider: { color: colors.text, fontWeight: '600' },
});
