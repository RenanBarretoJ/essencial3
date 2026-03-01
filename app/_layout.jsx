import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { requestPermissions } from '../lib/notifications';

export default function RootLayout() {
  useEffect(() => {
    requestPermissions();
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#F2F2F7',
          borderTopColor: '#C6C6C8',
        },
        headerStyle: {
          backgroundColor: '#F2F2F7',
        },
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 17,
          color: '#000000',
        },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Hoje',
          tabBarLabel: 'Hoje',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="checkmark-circle-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="lembretes"
        options={{
          title: 'Lembretes',
          tabBarLabel: 'Lembretes',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="alarm-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
