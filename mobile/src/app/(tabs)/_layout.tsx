import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { useAuth } from '@/lib/auth';
import { palette } from '@/theme/palette';

export default function TabsLayout() {
  const { unreadCount } = useAuth();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: 14,
          height: 74,
          paddingBottom: 10,
          paddingTop: 10,
          borderTopColor: palette.border,
          borderTopWidth: 1,
          borderRadius: 24,
          backgroundColor: palette.panelElevated,
          shadowColor: '#000000',
          shadowOpacity: 0.28,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 12 },
          elevation: 18,
        },
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.muted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: -2,
        },
        tabBarItemStyle: {
          borderRadius: 16,
          marginHorizontal: 4,
        },
        tabBarBadgeStyle: {
          backgroundColor: palette.danger,
          color: palette.text,
          fontWeight: '700',
        },
        sceneStyle: {
          backgroundColor: palette.background,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="planner"
        options={{
          title: 'Tarefas',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Mensagens',
          tabBarBadge: unreadCount ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-ellipses-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: 'Projetos',
          tabBarIcon: ({ color, size }) => <Ionicons name="folder-open-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
