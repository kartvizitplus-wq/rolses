import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/lib/auth';
import { colors } from '../src/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerShadowVisible: false,
            headerTintColor: colors.ink,
            headerTitleStyle: { fontWeight: '800' },
            contentStyle: { backgroundColor: colors.bg },
            headerBackTitle: 'Geri',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="task/[id]" options={{ title: 'Görev' }} />
          <Stack.Screen name="apply/[roleId]" options={{ title: 'Başvur', presentation: 'modal' }} />
          <Stack.Screen name="order/[id]" options={{ title: 'İş' }} />
          <Stack.Screen name="talent/[id]" options={{ title: 'Profil' }} />
          <Stack.Screen name="login" options={{ title: 'Giriş', presentation: 'modal' }} />
          <Stack.Screen name="legal" options={{ title: 'Kurallar ve gizlilik' }} />
          <Stack.Screen name="edit-profile" options={{ title: 'Profili düzenle' }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
