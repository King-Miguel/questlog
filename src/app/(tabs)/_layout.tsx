import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import { View } from 'react-native';

import { XpNotice } from '@/components/game-ui';
import { palette, spacing } from '@/lib/theme';
import { useQuests } from '@/providers/quests';

export default function TabsLayout() {
  const { notice } = useQuests();

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: palette.gold,
          tabBarInactiveTintColor: palette.textFaint,
          tabBarStyle: {
            backgroundColor: palette.bgElevated,
            borderTopColor: palette.border,
            borderTopWidth: 1,
            height: 64,
            paddingTop: spacing.sm,
            paddingBottom: spacing.sm,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="quests"
          options={{
            title: 'Quests',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'journal' : 'journal-outline'} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="stats"
          options={{
            title: 'Stats',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'stats-chart' : 'stats-chart-outline'} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={size} color={color} />
            ),
          }}
        />
      </Tabs>
      <XpNotice notice={notice} />
    </View>
  );
}
