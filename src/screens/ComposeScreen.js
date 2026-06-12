import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, FlatList, StyleSheet } from 'react-native';
import { useGame } from '../state/GameContext';
import { ridersByCategory, RIDERS_BY_ID } from '../data/index';
import { SLOTS, validateTeam } from '../engine/team';
import { computeEventOutcome } from '../engine/season';
import { colors, space, radius } from '../ui/theme';

const EMPTY = { senior26: null, junior26: null, senior20: null, junior20: null, eliteWomen1: null, eliteWomen2: null };

export default function ComposeScreen({ navigation }) {
  const { state, dispatch } = useGame();
  const event = state.season[state.currentIndex];
  const byCat = ridersByCategory();
  const [team, setTeam] = useState(EMPTY);
  const [activeSlot, setActiveSlot] = useState(null);

  const result = validateTeam(team, RIDERS_BY_ID);

  function pick(riderId) {
    setTeam((t) => ({ ...t, [activeSlot.id]: riderId }));
    setActiveSlot(null);
  }

  function lock() {
    const outcome = computeEventOutcome({
      event, playerName: state.player.name, playerTeam: team, rivals: state.rivals,
      ridersById: RIDERS_BY_ID, ridersByCategory: byCat, seed: event.round,
    });
    dispatch({ type: 'LOCK_TEAM', payload: { eventId: event.id, team, outcome } });
    navigation.navigate('EventResult');
  }

  const options = activeSlot
    ? byCat[activeSlot.category].filter((r) => {
        if (activeSlot.id === 'eliteWomen1') return r.id !== team.eliteWomen2;
        if (activeSlot.id === 'eliteWomen2') return r.id !== team.eliteWomen1;
        return true;
      })
    : [];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ gap: space.sm, padding: space.md }}>
        {SLOTS.map((slot) => {
          const rider = team[slot.id] ? RIDERS_BY_ID[team[slot.id]] : null;
          return (
            <Pressable key={slot.id} onPress={() => setActiveSlot(slot)} style={styles.slot} accessibilityRole="button">
              <Text style={styles.slotLabel}>{slot.label}</Text>
              {rider
                ? <Text style={styles.slotRider}>{rider.name} · {rider.country} · ×{rider.cote.toFixed(1)}</Text>
                : <Text style={styles.slotEmpty}>Choisir un pilote…</Text>}
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        {!result.valid && <Text style={styles.error}>{result.errors[0]}</Text>}
        <Pressable disabled={!result.valid} onPress={lock} style={[styles.cta, !result.valid && styles.ctaDisabled]} accessibilityRole="button">
          <Text style={styles.ctaText}>Verrouiller l'équipe</Text>
        </Pressable>
      </View>

      <Modal visible={!!activeSlot} animationType="slide" transparent onRequestClose={() => setActiveSlot(null)}>
        <View style={styles.modalWrap}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{activeSlot?.label}</Text>
            <FlatList
              data={options.sort((a, b) => a.uciRank - b.uciRank)}
              keyExtractor={(r) => r.id}
              renderItem={({ item }) => (
                <Pressable onPress={() => pick(item.id)} style={styles.option} accessibilityRole="button">
                  <Text style={styles.optionName}>#{item.uciRank} {item.name}</Text>
                  <Text style={styles.optionCote}>×{item.cote.toFixed(1)}</Text>
                </Pressable>
              )}
            />
            <Pressable onPress={() => setActiveSlot(null)} style={styles.close}><Text style={styles.closeText}>Fermer</Text></Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  slot: { backgroundColor: colors.surface, borderRadius: radius.md, padding: space.md, borderWidth: 1, borderColor: colors.border },
  slotLabel: { fontSize: 12, color: colors.muted },
  slotRider: { fontSize: 16, color: colors.text, fontWeight: '600', marginTop: 2 },
  slotEmpty: { fontSize: 16, color: colors.primary, marginTop: 2 },
  footer: { padding: space.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  error: { color: '#DC2626', marginBottom: space.sm },
  cta: { backgroundColor: colors.good, padding: space.md, borderRadius: radius.md, alignItems: 'center' },
  ctaDisabled: { opacity: 0.4 },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modal: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: space.md, maxHeight: '70%' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: space.sm, color: colors.text },
  option: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  optionName: { color: colors.text }, optionCote: { fontWeight: '700', color: colors.primary },
  close: { padding: space.md, alignItems: 'center' }, closeText: { color: colors.muted },
});
