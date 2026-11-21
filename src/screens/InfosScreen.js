import React, { useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { languagesProgress } from '../i18n/progress';
import { colors, space, radius } from '../ui/theme';

export default function InfosScreen() {
  const { t } = useTranslation();
  const rows = useMemo(() => languagesProgress(), []);
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.h2}>{t('infos.title')}</Text>
      <Text style={styles.p}>{t('infos.inDevelopment')}</Text>
      <Text style={styles.h2}>{t('infos.translations')}</Text>
      {rows.map((row) => (
        <View
          key={row.code}
          style={styles.row}
          accessibilityLabel={t('infos.progressA11y', { name: row.name, percent: row.percent })}
        >
          <View style={styles.line}>
            <Text style={styles.name}>{row.name}</Text>
            <Text style={styles.percent}>{row.percent} %</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.bar, { width: `${row.percent}%` }]} />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.md, gap: space.sm },
  h2: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: space.md },
  p: { color: colors.text, lineHeight: 20 },
  row: { gap: space.xs },
  line: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { color: colors.text, fontWeight: '600' },
  percent: { color: colors.muted },
  track: {
    height: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bar: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.sm },
});
