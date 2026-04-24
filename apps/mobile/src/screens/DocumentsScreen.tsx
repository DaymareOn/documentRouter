import React, { useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useDocumentStore } from '../stores/documentStore';
import { DocumentCard } from '../components/DocumentCard';
import type { Document } from '@vibe-router/shared-types';
import type { DocumentStackParamList } from '../navigation/types';

type DocsNavProp = StackNavigationProp<DocumentStackParamList, 'Documents'>;

export const DocumentsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<DocsNavProp>();
  const { documents, isLoading, error, fetchDocuments } = useDocumentStore();

  useEffect(() => {
    void fetchDocuments();
  }, []);

  const handleRefresh = useCallback(() => {
    void fetchDocuments();
  }, [fetchDocuments]);

  const handleDocumentPress = useCallback(
    (doc: Document) => {
      navigation.navigate('DocumentDetail', { documentId: doc.id });
    },
    [navigation],
  );

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{t('common.error')}</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.retryButton}>
          <Text style={styles.retryText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={documents}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <DocumentCard document={item} onPress={() => handleDocumentPress(item)} />
        )}
        contentContainerStyle={documents.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.center}>
              <Text style={styles.emptyText}>{t('documents.empty')}</Text>
            </View>
          )
        }
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  list: { paddingVertical: 8 },
  emptyContainer: { flexGrow: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 16, color: '#6B7280' },
  errorText: { fontSize: 16, color: '#EF4444', marginBottom: 12 },
  retryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
