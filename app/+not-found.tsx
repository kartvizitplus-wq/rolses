import React from 'react';
import { router } from 'expo-router';
import { Button, Empty, Screen } from '../src/components/ui';

export default function NotFound() {
  return (
    <Screen>
      <Empty
        icon="compass-outline"
        title="Sayfa bulunamadı"
        action={<Button title="Görevlere dön" onPress={() => router.replace('/')} />}
      />
    </Screen>
  );
}
