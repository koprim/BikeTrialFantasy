import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, FlatList, StyleSheet } from 'react-native';
import { useGame, useNow } from '../state/GameContext';
import { CARDS, CARDS_BY_ID, RIDERS_BY_ID, EVENTS_BY_ID, BALANCE, EDITION } from '../data/index';
import { SLOTS, emptyTeam, normalizeTeam, validateCardTeam } from '../engine/team';
import { ownedRefs } from '../engine/collection';
import { describeEffect } from '../engine/effects';
import { RARITY_LABELS } from '../engine/rarity';
import { eventStatus } from '../engine/calendar';
import { colors, space, radius } from '../ui/theme';

const refLabel = (ref) => `${CARDS_BY_ID[ref.cardId]?.name ?? '?'} · ${RARITY_LABELS[ref.rarity]}`;
const sameRef = (a, b) => a.cardId === b.cardId && a.rarity === b.rarity;
const PICKER_TITLES = { technique: 'Technique', equipment: 'Équipement', referee: 'Arbitre' };

export default function ComposeScreen({ navigation, route }) {
  const { state, dispatch } = useGame();
  const now = useNow();
  const event = EVENTS_BY_ID[route.params.eventId];
  const [team, setTeam] = useState(normalizeTeam(state.picks[event.id], EDITION) || emptyTeam());
  const [picker, setPicker] = useState(null); // { kind: 'pilot' | 'technique' | 'equipment' | 'referee', slot? }

  const result = validateCardTeam(team, { cardsById: CARDS_BY_ID, ridersById: RIDERS_BY_ID, owned: state.collection.owned, balance: BALANCE });
  const techLimit = (entry) => BALANCE.slots.techniquesByPilotRarity[entry.rarity];

  function options() {
    if (!picker) return [];
    const types = { pilot: 'PILOT', technique: 'TECHNIQUE', equipment: 'EQUIPMENT', referee: 'REFEREE' };
    return ownedRefs(state.collection, CARDS, (c) => c.type === types[picker.kind]
      && (picker.kind !== 'pilot' || RIDERS_BY_ID[c.subject]?.category === picker.slot.category));
  }

  function choose(option) {
    const ref = { cardId: option.cardId, rarity: option.rarity };
    setTeam((t) => {
      if (picker.kind === 'pilot') {
        const prev = t.slots[picker.slot.id];
        const techniques = (prev ? prev.techniques : []).slice(0, techLimit(ref));
        return { ...t, slots: { ...t.slots, [picker.slot.id]: { ...ref, techniques } } };
      }
      if (picker.kind === 'technique') {
        const entry = t.slots[picker.slot.id];
        return { ...t, slots: { ...t.slots, [picker.slot.id]: { ...entry, techniques: [...entry.techniques, ref] } } };
      }
      if (picker.kind === 'equipment') return { ...t, equipment: [...t.equipment, ref] };
      return { ...t, referee: ref };
    });
    setPicker(null);
  }

  const removeTechnique = (slotId, ref) => setTeam((t) => ({
    ...t, slots: { ...t.slots, [slotId]: { ...t.slots[slotId], techniques: t.slots[slotId].techniques.filter((x) => !sameRef(x, ref)) } },
  }));
  const removeEquipment = (ref) => setTeam((t) => ({ ...t, equipment: t.equipment.filter((x) => !sameRef(x, ref)) }));

  function save() {
    dispatch({ type: 'SAVE_TEAM', payload: { eventId: event.id, team, now } });
    navigation.popToTop();
  }

  if (eventStatus(event, now) !== 'open') {
    return <View style={styles.closed}><Text style={styles.closedText}>Composition fermée</Text></View>;
  }

  const chip = (ref, onPress) => (
    <Pressable key={`${ref.cardId}:${ref.rarity}`} onPress={onPress} style={styles.chip} accessibilityRole="button" accessibilityLabel={`Retirer ${refLabel(ref)}`}>
      <Text style={styles.chipText}>{refLabel(ref)} ✕</Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ gap: space.sm, padding: space.md }}>
        {SLOTS.map((slot) => {
          const entry = team.slots[slot.id];
          const rider = entry ? RIDERS_BY_ID[CARDS_BY_ID[entry.cardId]?.subject] : null;
          return (
            <View key={slot.id} style={styles.slot}>
              <Pressable onPress={() => setPicker({ kind: 'pilot', slot })} accessibilityRole="button">
                <Text style={styles.slotLabel}>{slot.label}</Text>
                {entry
                  ? <Text style={styles.slotRider}>{refLabel(entry)}{rider ? ` · ×${rider.cote.toFixed(1)}` : ''}</Text>
                  : <Text style={styles.slotEmpty}>Choisir un pilote…</Text>}
              </Pressable>
              {entry && (
                <View style={styles.chips}>
                  {entry.techniques.map((t) => chip(t, () => removeTechnique(slot.id, t)))}
                  {entry.techniques.length < techLimit(entry) && (
                    <Pressable onPress={() => setPicker({ kind: 'technique', slot })} style={styles.add} accessibilityRole="button">
                      <Text style={styles.addText}>+ Technique ({entry.techniques.length}/{techLimit(entry)})</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          );
        })}

        <Text style={styles.section}>Équipe</Text>
        <View style={styles.slot}>
          <Text style={styles.slotLabel}>Équipements ({team.equipment.length}/{BALANCE.slots.equipment})</Text>
          <View style={styles.chips}>
            {team.equipment.map((e) => chip(e, () => removeEquipment(e)))}
            {team.equipment.length < BALANCE.slots.equipment && (
              <Pressable onPress={() => setPicker({ kind: 'equipment' })} style={styles.add} accessibilityRole="button">
                <Text style={styles.addText}>+ Équipement</Text>
              </Pressable>
            )}
          </View>
        </View>
        <View style={styles.slot}>
          <Text style={styles.slotLabel}>Arbitre</Text>
          {team.referee
            ? <View style={styles.chips}>{chip(team.referee, () => setTeam((t) => ({ ...t, referee: null })))}</View>
            : (
              <Pressable onPress={() => setPicker({ kind: 'referee' })} accessibilityRole="button">
                <Text style={styles.slotEmpty}>Choisir un arbitre…</Text>
              </Pressable>
            )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {!result.valid && <Text style={styles.error}>{result.errors[0]}</Text>}
        <Pressable disabled={!result.valid} onPress={save} style={[styles.cta, !result.valid && styles.ctaDisabled]} accessibilityRole="button">
          <Text style={styles.ctaText}>Enregistrer l'équipe</Text>
        </Pressable>
      </View>

      <Modal visible={!!picker} animationType="slide" transparent onRequestClose={() => setPicker(null)}>
        <View style={styles.modalWrap}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{picker && (picker.kind === 'pilot' ? picker.slot.label : PICKER_TITLES[picker.kind])}</Text>
            <FlatList
              data={options()}
              keyExtractor={(o) => `${o.cardId}:${o.rarity}`}
              ListEmptyComponent={<Text style={styles.empty}>Aucune carte de ce type. Ouvre des packs !</Text>}
              renderItem={({ item }) => {
                const rider = item.card.type === 'PILOT' ? RIDERS_BY_ID[item.card.subject] : null;
                return (
                  <Pressable onPress={() => choose(item)} style={styles.option} accessibilityRole="button"
                    accessibilityLabel={`Choisir ${item.card.name} ${RARITY_LABELS[item.rarity]}`}>
                    <Text style={styles.optionName}>{item.card.name} · {RARITY_LABELS[item.rarity]}{rider ? ` · ×${rider.cote.toFixed(1)}` : ''}</Text>
                    {item.card.effects.map((e, i) => <Text key={i} style={styles.optionEffect}>{describeEffect(e, item.rarity, BALANCE)}</Text>)}
                  </Pressable>
                );
              }}
            />
            <Pressable onPress={() => setPicker(null)} style={styles.close}><Text style={styles.closeText}>Fermer</Text></Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  closed: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  closedText: { fontSize: 18, color: colors.muted },
  section: { fontWeight: '700', color: colors.accent, marginTop: space.sm },
  slot: { backgroundColor: colors.surface, borderRadius: radius.md, padding: space.md, borderWidth: 1, borderColor: colors.border, gap: space.xs },
  slotLabel: { fontSize: 12, color: colors.muted },
  slotRider: { fontSize: 16, color: colors.text, fontWeight: '600', marginTop: 2 },
  slotEmpty: { fontSize: 16, color: colors.primary, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  chip: { paddingVertical: 4, paddingHorizontal: space.sm, borderRadius: radius.lg, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  chipText: { fontSize: 12, color: colors.text },
  add: { paddingVertical: 4, paddingHorizontal: space.sm },
  addText: { fontSize: 12, color: colors.primary, fontWeight: '700' },
  footer: { padding: space.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  error: { color: '#DC2626', marginBottom: space.sm },
  cta: { backgroundColor: colors.good, padding: space.md, borderRadius: radius.md, alignItems: 'center' },
  ctaDisabled: { opacity: 0.4 },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modal: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: space.md, maxHeight: '70%' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: space.sm, color: colors.text },
  empty: { color: colors.muted, padding: space.md, textAlign: 'center' },
  option: { paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  optionName: { color: colors.text, fontWeight: '600' },
  optionEffect: { color: colors.muted, fontSize: 12, marginTop: 2 },
  close: { padding: space.md, alignItems: 'center' }, closeText: { color: colors.muted },
});
