import { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type DocumentStackParamList = {
  Documents: undefined;
  DocumentDetail: { documentId: string };
};

export type AppTabParamList = {
  DocumentsStack: NavigatorScreenParams<DocumentStackParamList>;
  Settings: undefined;
};
