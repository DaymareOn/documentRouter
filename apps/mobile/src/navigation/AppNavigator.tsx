import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { DocumentsScreen } from '../screens/DocumentsScreen';
import { DocumentDetailScreen } from '../screens/DocumentDetailScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import type { AppTabParamList, DocumentStackParamList } from './types';

const Tab = createBottomTabNavigator<AppTabParamList>();
const DocStack = createStackNavigator<DocumentStackParamList>();

const DocumentsStackNavigator: React.FC = () => {
  const { t } = useTranslation();
  return (
    <DocStack.Navigator>
      <DocStack.Screen
        name="Documents"
        component={DocumentsScreen}
        options={{ title: t('documents.title') }}
      />
      <DocStack.Screen
        name="DocumentDetail"
        component={DocumentDetailScreen}
        options={{ title: t('documentDetail.title') }}
      />
    </DocStack.Navigator>
  );
};

export const AppNavigator: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          const iconName: React.ComponentProps<typeof Ionicons>['name'] =
            route.name === 'DocumentsStack' ? 'document-text-outline' : 'settings-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="DocumentsStack"
        component={DocumentsStackNavigator}
        options={{ title: t('documents.title') }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: t('settings.title'), headerShown: true }}
      />
    </Tab.Navigator>
  );
};
