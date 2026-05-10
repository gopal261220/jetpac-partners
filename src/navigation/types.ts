import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type AuthStackParamList = {
  SignIn: undefined;
  VerifyOtp: { email: string };
};

export type BuyStackParamList = {
  Workspace: undefined;
  DestinationList: undefined;
  DestinationPdp: { destinationId: string };
};

export type AppTabsParamList = {
  Home: undefined;
  Buy: NavigatorScreenParams<BuyStackParamList> | undefined;
  Inventory:
    | {
        initialTab?: 'packs' | 'esims';
        openPurchase?: 'packs' | 'esims';
      }
    | undefined;
  Wallet: undefined;
};

export type AppStackParamList = {
  MainTabs: NavigatorScreenParams<AppTabsParamList> | undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList> | undefined;
  App: NavigatorScreenParams<AppStackParamList> | undefined;
};

export type SignInScreenProps = NativeStackScreenProps<AuthStackParamList, 'SignIn'>;
export type VerifyOtpScreenProps = NativeStackScreenProps<AuthStackParamList, 'VerifyOtp'>;
export type BuyDestinationListScreenProps = NativeStackScreenProps<
  BuyStackParamList,
  'DestinationList'
>;
export type BuyDestinationPdpScreenProps = NativeStackScreenProps<
  BuyStackParamList,
  'DestinationPdp'
>;
export type AllocateWorkspaceScreenProps = NativeStackScreenProps<BuyStackParamList, 'Workspace'>;

export type AppTabScreenProps<T extends keyof AppTabsParamList> = CompositeScreenProps<
  BottomTabScreenProps<AppTabsParamList, T>,
  NativeStackScreenProps<AppStackParamList>
>;

export type ProfileScreenProps = NativeStackScreenProps<AppStackParamList, 'Profile'>;
