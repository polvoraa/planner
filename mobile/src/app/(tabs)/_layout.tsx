import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/lib/auth';
import { palette } from '@/theme/palette';

function DockTabIcon({
  color,
  focused,
  icon,
  label,
  size,
}: {
  color: string;
  focused: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  size: number;
}) {
  return (
    <View style={[styles.itemShell, focused && styles.itemShellActive]}>
      <Ionicons name={icon} size={size} color={color} />
      <Text style={[styles.itemLabel, focused && styles.itemLabelActive]}>{label}</Text>
    </View>
  );
}

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
          height: 88,
          paddingBottom: 12,
          paddingTop: 12,
          paddingHorizontal: 10,
          borderTopColor: 'transparent',
          borderTopWidth: 1,
          borderRadius: 26,
          backgroundColor: palette.panelElevated,
          shadowColor: '#000000',
          shadowOpacity: 0.34,
          shadowRadius: 28,
          shadowOffset: { width: 0, height: 16 },
          elevation: 18,
        },
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.text,
        tabBarLabelStyle: {
          display: 'none',
          fontSize: 11,
          fontWeight: '700',
          marginTop: -2,
        },
        tabBarItemStyle: {
          borderRadius: 18,
          marginHorizontal: 4,
          paddingVertical: 2,
        },
        tabBarShowLabel: false,
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
          tabBarIcon: ({ color, focused, size }) => (
            <DockTabIcon color={color} focused={focused} icon={focused ? 'home' : 'home-outline'} label="Home" size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="planner"
        options={{
          title: 'Tarefas',
          tabBarIcon: ({ color, focused, size }) => (
            <DockTabIcon
              color={color}
              focused={focused}
              icon={focused ? 'calendar' : 'calendar-outline'}
              label="Tarefas"
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Mensagens',
          tabBarBadge: unreadCount ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
          tabBarIcon: ({ color, focused, size }) => (
            <DockTabIcon
              color={color}
              focused={focused}
              icon={focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'}
              label="Mensagens"
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: 'Projetos',
          tabBarIcon: ({ color, focused, size }) => (
            <DockTabIcon
              color={color}
              focused={focused}
              icon={focused ? 'folder-open' : 'folder-open-outline'}
              label="Projetos"
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="finance"
        options={{
          title: 'Financeiro',
          tabBarIcon: ({ color, focused, size }) => (
            <DockTabIcon
              color={color}
              focused={focused}
              icon={focused ? 'wallet' : 'wallet-outline'}
              label="Financeiro"
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  itemShell: {
    minWidth: 58,
    minHeight: 58,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.softPanel,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    shadowColor: '#000000',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  itemShellActive: {
    borderColor: 'rgba(255, 106, 0, 0.58)',
    backgroundColor: '#232323',
  },
  itemLabel: {
    color: palette.subtleText,
    fontSize: 10,
    fontWeight: '700',
  },
  itemLabelActive: {
    color: palette.text,
  },
});
