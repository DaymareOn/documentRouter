import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useDocumentStore } from '../stores/documentStore';
import type { DocumentStackParamList } from '../navigation/types';

type DocDetailRouteProp = RouteProp<DocumentStackParamList, 'DocumentDetail'>;

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
);

export const DocumentDetailScreen: React.FC = () => {
  const { t } = useTranslation();
  const route = useRoute<DocDetailRouteProp>();
  const { documentId } = route.params;
  const { selectedDocument, isLoading, fetchDocument } = useDocumentStore();

  useEffect(() => {
    void fetchDocument(documentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  if (isLoading || !selectedDocument) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const doc = selectedDocument;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Row label={t('documentDetail.filename')} value={doc.filename} />
        <Row label={t('documentDetail.status')} value={t(`documents.status.${doc.status}`)} />
        <Row
          label={t('documentDetail.size')}
          value={`${doc.size} ${t('documentDetail.bytes')}`}
        />
        <Row label={t('documentDetail.source')} value={t(`documents.source.${doc.source}`)} />
        <Row label={t('documentDetail.mimeType')} value={doc.mimeType} />
        <Row
          label={t('documentDetail.createdAt')}
          value={new Date(doc.createdAt).toLocaleString()}
        />
        <Row
          label={t('documentDetail.updatedAt')}
          value={new Date(doc.updatedAt).toLocaleString()}
        />
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('documentDetail.tags')}</Text>
        {doc.tags.length > 0 ? (
          <View style={styles.tagsRow}>
            {doc.tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyTags}>{t('documentDetail.noTags')}</Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  content: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  rowLabel: { fontSize: 14, color: '#6B7280', flex: 1 },
  rowValue: { fontSize: 14, color: '#111827', flex: 2, textAlign: 'right' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  tagText: { fontSize: 13, color: '#3B82F6' },
  emptyTags: { fontSize: 14, color: '#6B7280' },
});
