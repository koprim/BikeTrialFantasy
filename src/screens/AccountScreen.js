import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useGame } from '../state/GameContext';
import { errorMessage } from '../ui/errorMessages';
import { useAsyncAction } from '../ui/useAsyncAction';
import { colors, space, radius } from '../ui/theme';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Loads the AccountInfo once; undefined while loading, null without an account.
function useAccount(actions) {
  const [account, setAccount] = useState(undefined);
  useEffect(() => {
    let active = true;
    actions.account().then((info) => active && setAccount(info));
    return () => {
      active = false;
    };
  }, [actions]);
  return account;
}

export default function AccountScreen() {
  const { actions } = useGame();
  const account = useAccount(actions);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState(null);
  const { run: submit, busy } = useAsyncAction(async (call, address, successMessage) => {
    const result = await call(address);
    setMessage(result.ok ? successMessage : errorMessage(result.error));
  });

  if (account === undefined) return null;
  if (account && !account.isAnonymous) {
    return (
      <View style={styles.page}>
        <Text style={styles.text}>Compte sauvegardé : {account.email}</Text>
      </View>
    );
  }

  const address = email.trim();
  const disabled = busy || !EMAIL_PATTERN.test(address);
  const save = () =>
    submit(actions.saveAccount, address, `Un lien de confirmation a été envoyé à ${address}. Ouvre-le pour terminer.`);
  const signIn = () =>
    submit(
      actions.signIn,
      address,
      `Un lien de connexion a été envoyé à ${address}. La partie invitée de ce navigateur sera remplacée.`,
    );

  return (
    <View style={styles.page}>
      <Text style={styles.text}>
        Tu joues avec un compte invité, lié à ce navigateur ou à cet appareil. Sauvegarde-le pour retrouver ta
        collection partout.
      </Text>
      {account && account.pendingEmail ? (
        <Text style={styles.text}>Confirmation en attente pour {account.pendingEmail}.</Text>
      ) : null}
      <TextInput
        accessibilityLabel="Adresse e-mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        accessibilityState={{ busy, disabled }}
        onPress={save}
        style={[styles.cta, disabled && styles.disabled]}
      >
        <Text style={styles.ctaText}>Sauvegarder mon compte</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        accessibilityState={{ busy, disabled }}
        onPress={signIn}
        style={[styles.secondary, disabled && styles.disabled]}
      >
        <Text style={styles.secondaryText}>J'ai déjà un compte</Text>
      </Pressable>
      {message ? (
        <Text accessibilityRole="alert" style={styles.text}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.md, gap: space.sm },
  text: { color: colors.text, lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: space.md,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  cta: { backgroundColor: colors.primary, borderRadius: radius.md, padding: space.md, alignItems: 'center' },
  ctaText: { color: '#fff', fontWeight: '700' },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
    alignItems: 'center',
  },
  secondaryText: { color: colors.text, fontWeight: '700' },
  disabled: { opacity: 0.4 },
});
