import React, { useState } from 'react';
import { ScrollView, View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '../i18n/languages';
import { setLanguage } from '../i18n';
import { useGame, useNow } from '../state/GameContext';
import { BALANCE } from '../data/index';
import { confirm } from '../ui/confirm';
import { errorMessage } from '../ui/errorMessages';
import { useAsyncAction } from '../ui/useAsyncAction';
import { colors, space, radius } from '../ui/theme';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function RulesScreen({ navigation }) {
  const { t, i18n } = useTranslation();
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

  const saveName = () => run(() => actions.setName(name.trim() || t('rules.defaultName')));
  const applyDate = () => run(() => actions.setSimulatedDate(date));

  async function clearDate() {
    const result = await run(() => actions.setSimulatedDate(null));
    if (result?.ok) setDate('');
  }

  async function reset() {
    if (!(await confirm(t('rules.confirmReset')))) return;
    const result = await run(actions.reset);
    if (!result?.ok) return;
    setName(result.patch.player.name); // reset's patch is the full new PlayerState
    setDate('');
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.h2}>{t('rules.title')}</Text>
      <Text style={styles.p}>{t('rules.teamComposition')}</Text>
      <Text style={styles.p}>{t('rules.riderPoints')}</Text>
      <Text style={styles.p}>{t('rules.outsider')}</Text>
      <Text style={styles.p}>{t('rules.lockRule')}</Text>

      <Text style={styles.h2}>{t('rules.cardsTitle')}</Text>
      <Text style={styles.p}>{t('rules.ownedCards')}</Text>
      <Text style={styles.p}>{t('rules.cardTypes', { equipment: BALANCE.slots.equipment })}</Text>
      <Text style={styles.p}>{t('rules.rarities')}</Text>
      <Text style={styles.p}>
        {t('rules.packs', { size: BALANCE.pack.size, pityE: BALANCE.pity.E, pityL: BALANCE.pity.L })}
      </Text>
      <Text style={styles.p}>{t('rules.duplicates')}</Text>

      <Text style={styles.h2}>{t('rules.profileTitle')}</Text>
      <Text style={styles.p}>{t('rules.currentName', { name: state.player.name })}</Text>
      <TextInput value={name} onChangeText={setName} style={styles.input} />
      <Pressable
        disabled={busy}
        onPress={saveName}
        style={[styles.btn, busy && styles.disabled]}
        accessibilityRole="button"
        accessibilityState={{ busy, disabled: busy }}
      >
        <Text style={styles.btnText}>{t('rules.saveName')}</Text>
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
          <Text style={styles.secondaryText}>{t('rules.saveAccount')}</Text>
        </Pressable>
      )}

      <Text style={styles.h2}>{t('rules.language.title')}</Text>
      <View style={styles.rowBtns}>
        {LANGUAGES.map((language) => {
          const selected = i18n.language === language.code;
          return (
            <Pressable
              key={language.code}
              onPress={() => setLanguage(language.code)}
              style={[styles.btn, styles.flex, !selected && styles.secondary]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Text style={selected ? styles.btnText : styles.secondaryText}>{language.name}</Text>
            </Pressable>
          );
        })}
      </View>

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
          <Text style={styles.btnText}>{t('rules.reset')}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function SimulatedDate({ now, simulated, date, onChange, onApply, onClear, busy }) {
  const { t } = useTranslation();
  const applyDisabled = busy || !DATE_RE.test(date);
  return (
    <>
      <Text style={styles.h2}>{t('rules.simulatedDateTitle')}</Text>
      <Text style={styles.p}>{t(simulated ? 'rules.gameDateSimulated' : 'rules.gameDate', { date: now })}</Text>
      <TextInput value={date} onChangeText={onChange} placeholder={t('rules.datePlaceholder')} style={styles.input} />
      <View style={styles.rowBtns}>
        <Pressable
          disabled={applyDisabled}
          onPress={onApply}
          style={[styles.btn, styles.flex, applyDisabled && styles.disabled]}
          accessibilityRole="button"
          accessibilityState={{ busy, disabled: applyDisabled }}
        >
          <Text style={styles.btnText}>{t('rules.apply')}</Text>
        </Pressable>
        <Pressable
          disabled={busy}
          onPress={onClear}
          style={[styles.btn, styles.flex, styles.secondary, busy && styles.disabled]}
          accessibilityRole="button"
          accessibilityState={{ busy, disabled: busy }}
        >
          <Text style={styles.secondaryText}>{t('rules.backToToday')}</Text>
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
