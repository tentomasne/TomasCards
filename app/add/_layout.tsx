import React from 'react';
import { Stack } from 'expo-router';

export default function AddLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* toto bude /add */}
      <Stack.Screen name="index" />
      {/* toto /add/scan */}
      <Stack.Screen name="scan" />
      {/* toto /add/manual */}
      <Stack.Screen name="manual" />
      {/* toto /add/custom */}
      <Stack.Screen name="custom" />
    </Stack>
  );
}
