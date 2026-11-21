import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useGame } from '../state/GameContext';
import { errorMessage } from '../ui/errorMessages';
import { isEmailAddress } from '../ui/emailAddress';
import { useAsyncAction } from '../ui/useAsyncAction';
import { colors, space, radius } from '../ui/theme';

// Loads the AccountInfo: undefined while loading, null without an account or when it could not be read (failed).
// `refresh` re-reads it after an action and resolves whether it could; a failed refresh keeps the last status.
function useAccount(actions) {
  const [account, setAccount] = useState(undefined);
  const [failed, setFailed] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    actions
      .account()
      .then((info) => mounted.current && setAccount(info))
      .catch(() => {
        if (!mounted.current) return;
        setAccount(null);
        setFailed(true); // reported on screen; the guest form stays usable
      });
    return () => {
      mounted.current = false;
    };
  }, [actions]);

  const refresh = useCallback(async () => {
    try {
      const info = await actions.account();
      if (mounted.current) {
        setAccount(info);
        setFailed(false);
      }
      return true;
    } catch {
      return false; // the caller notes the stale status
    }
  }, [actions]);

  return { account, failed, refresh };
}

export default function AccountScreen() {
  const { t } = useTranslation();
  const { actions } = useGame();
  const { account, failed, refresh } = useAccount(actions);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState(null);
  const { run: submit, busy } = useAsyncAction(async (call, address, successMessage) => {
    const result = await call(address);
    if (!result.ok) {
      setMessage(errorMessage(result.error));
      return;
    }
    const refreshed = await refresh(); // shows the pending confirmation
    setMessage(
      refreshed
        ? successMessage
        : t('account.withStaleStatus', { message: successMessage, note: t('account.staleStatus') }),
    );
  });

  if (account === undefined) return null;
  if (account && !account.isAnonymous) {
    return (
      <View style={styles.page}>
        <Text style={styles.text}>{t('account.saved', { email: account.email })}</Text>
      </View>
    );
  }

  const address = email.trim();
  const disabled = busy || !isEmailAddress(address);
  const save = () => submit(actions.saveAccount, address, t('account.saveSent', { address }));
  const signIn = () => submit(actions.signIn, address, t('account.signInSent', { address }));

  return (
    <View style={styles.page}>
      <Text style={styles.text}>{t('account.guestIntro')}</Text>
      {failed ? (
        <Text accessibilityRole="alert" style={styles.text}>
          {errorMessage('NETWORK')}
        </Text>
      ) : null}
      {account && account.pendingEmail ? (
        <Text style={styles.text}>{t('account.pending', { email: account.pendingEmail })}</Text>
      ) : null}
      <TextInput
        accessibilityLabel={t('account.emailLabel')}
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
        <Text style={styles.ctaText}>{t('account.save')}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        accessibilityState={{ busy, disabled }}
        onPress={signIn}
        style={[styles.secondary, disabled && styles.disabled]}
      >
        <Text style={styles.secondaryText}>{t('account.signIn')}</Text>
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
