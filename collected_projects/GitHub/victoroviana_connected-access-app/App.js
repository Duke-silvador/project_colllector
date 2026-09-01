import { useEffect, useRef } from 'react';
import { Alert, Platform, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as LocalAuthentication from 'expo-local-authentication';
import RootNavigator from './src/navigation/RootNavigator';
import { navigationRef } from './src/navigation/navigationRef';
import { registerForPushNotificationsAsync, notificationResponseRoutes } from './src/services/notifications';
import { ParentDataProvider, useParentDataContext } from './src/store/ParentDataContext';
import { ThemeProvider } from './src/store/ThemeContext';
import { AuthProvider, useAuth } from './src/store/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import FullScreenLoader from './src/components/FullScreenLoader';
import ChangePasswordModal from './src/components/ChangePasswordModal';
import { registerDeviceToken } from './src/services/supabaseApi';

const BIOMETRY_KEY = 'biometryConsent';
const normalizeFlag = (value) => {
  if (value == null) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  const normalized = value.toString().trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 't' || normalized === 'sim';
};

async function salvarTokenNoBanco(userId, token) {
  try {
    await registerDeviceToken({ responsavelId: userId, token });
    console.log('Token registrado via RPC para usuario:', userId);
  } catch (err) {
    console.error('Erro ao registrar token via RPC:', err);
  }
}

function AuthenticatedApp() {
  const { loading } = useParentDataContext();
  return (
    <>
      <RootNavigator />
      {loading ? <FullScreenLoader /> : null}
    </>
  );
}

function AppContent() {
  const { isAuthenticated, user } = useAuth();
  const mustChangePassword = normalizeFlag(
    user?.trocaSenha ?? user?.troca_senha ?? user?.mustChangePassword ?? user?.must_change_password
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    let isMounted = true;

    const maybeAskBiometry = async () => {
      try {
        const entries = await AsyncStorage.multiGet([BIOMETRY_KEY, 'schoolCode', 'username', 'password']);
        const values = entries.reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {});

        if (values[BIOMETRY_KEY] != null) return;
        if (!values.schoolCode || !values.username || !values.password) return;

        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = compatible ? await LocalAuthentication.isEnrolledAsync() : false;
        if (!enrolled || !isMounted) return;

        Alert.alert(
          'Ativar biometria?',
          'Deseja usar biometria para entrar automaticamente no aplicativo?',
          [
            {
              text: 'Agora nao',
              style: 'cancel',
              onPress: () => AsyncStorage.setItem(BIOMETRY_KEY, 'disabled'),
            },
            {
              text: 'Ativar',
              onPress: () => AsyncStorage.setItem(BIOMETRY_KEY, 'enabled'),
            },
          ]
        );
      } catch (err) {
        // ignore
      }
    };

    maybeAskBiometry();
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const syncToken = async () => {
      try {
        const token = await registerForPushNotificationsAsync();
        if (token && user?.id) {
          console.log('Registrando token para usuario:', user.id);
          await salvarTokenNoBanco(user.id, token);
        }
      } catch (error) {
        console.log('Erro ao sincronizar push token:', error);
      }
    };

    syncToken();
  }, [isAuthenticated, user?.id]);

  if (!isAuthenticated) {
    return <LoginScreen />;
  }
  return (
    <ParentDataProvider>
      <AuthenticatedApp />
      <ChangePasswordModal visible={mustChangePassword} forced />
    </ParentDataProvider>
  );
}

export default function App() {
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener(() => {});

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const route = response.notification.request.content.data?.route;
      const mappedRoute = notificationResponseRoutes[route] ?? route;
      if (mappedRoute && navigationRef.isReady()) {
        navigationRef.navigate(mappedRoute);
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  useEffect(() => {
    StatusBar.setHidden(false, 'fade');
    if (Platform.OS === 'android') {
      StatusBar.setTranslucent(false);
      StatusBar.setBackgroundColor('#2563EB', true);
      StatusBar.setBarStyle('light-content', true);
    }
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar hidden={false} translucent={false} />
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
