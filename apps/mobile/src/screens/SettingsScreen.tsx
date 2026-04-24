import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { useDocumentStore } from '../stores/documentStore';

export const SettingsScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuthStore();
  const { reset } = useDocumentStore();

  const handleLanguageChange = (lang: string): void => {
    void i18n.changeLanguage(lang);
  };

  const handleLogout = () => {
    Alert.alert(t('settings.logout'), t('settings.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.logout'),
        style: 'destructive',
        onPress: () => {
          reset();
          void logout();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.account')}</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('settings.name')}</Text>
            <Text style={styles.rowValue}>{user?.name ?? t('common.unknown')}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('settings.email')}</Text>
            <Text style={styles.rowValue}>{user?.email ?? t('common.unknown')}</Text>
          </View>
          <View style={[styles.row, styles.lastRow]}>
            <Text style={styles.rowLabel}>{t('settings.role')}</Text>
            <Text style={styles.rowValue}>{user?.role ?? t('common.unknown')}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={[styles.langRow, i18n.language === 'en' && styles.langRowActive]}
            onPress={() => handleLanguageChange('en')}
          >
            <Text style={[styles.langText, i18n.language === 'en' && styles.langTextActive]}>
              {t('settings.english')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.langRow, styles.lastRow, i18n.language === 'fr' && styles.langRowActive]}
            onPress={() => handleLanguageChange('fr')}
          >
            <Text style={[styles.langText, i18n.language === 'fr' && styles.langTextActive]}>
              {t('settings.french')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.appVersion')}</Text>
        <View style={styles.card}>
          <View style={[styles.row, styles.lastRow]}>
            <Text style={styles.rowLabel}>{t('settings.appVersion')}</Text>
            <Text style={styles.rowValue}>{t('settings.version')}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>{t('settings.logout')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  content: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  lastRow: { borderBottomWidth: 0 },
  rowLabel: { fontSize: 16, color: '#111827' },
  rowValue: { fontSize: 16, color: '#6B7280' },
  langRow: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  langRowActive: { backgroundColor: '#EFF6FF' },
  langText: { fontSize: 16, color: '#111827' },
  langTextActive: { color: '#007AFF', fontWeight: '600' },
  logoutButton: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  logoutText: { fontSize: 16, fontWeight: '600', color: '#EF4444' },
});
