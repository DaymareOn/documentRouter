import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Document } from '@vibe-router/shared-types';

interface DocumentCardProps {
  document: Document;
  onPress: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  processing: '#3B82F6',
  processed: '#10B981',
  failed: '#EF4444',
  archived: '#6B7280',
};

export const DocumentCard: React.FC<DocumentCardProps> = ({ document, onPress }) => {
  const { t } = useTranslation();
  const statusColor = STATUS_COLORS[document.status] ?? '#6B7280';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={styles.filename} numberOfLines={1}>
          {document.filename}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{t(`documents.status.${document.status}`)}</Text>
        </View>
      </View>
      <View style={styles.footer}>
        <Text style={styles.meta}>{t(`documents.source.${document.source}`)}</Text>
        <Text style={styles.meta}>{`${(document.size / 1024).toFixed(1)} KB`}</Text>
        <Text style={styles.meta}>{new Date(document.createdAt).toLocaleDateString()}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  filename: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  meta: {
    fontSize: 12,
    color: '#6B7280',
  },
});
