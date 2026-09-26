import { Tabs } from "expo-router";
import Icon from "@react-native-vector-icons/feather";
import { colors } from "@/src/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandPrimary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.surfaceSecondary, borderTopColor: colors.border },
        tabBarItemStyle: { alignSelf: "center" },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "500" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color, size }) => <Icon name="home" size={size} color={color} /> }} />
      <Tabs.Screen name="explore" options={{ title: "Explore", tabBarIcon: ({ color, size }) => <Icon name="search" size={size} color={color} /> }} />
      <Tabs.Screen name="playdates" options={{ title: "Playdates", tabBarIcon: ({ color, size }) => <Icon name="calendar" size={size} color={color} /> }} />
      <Tabs.Screen name="messages" options={{ title: "Messages", tabBarIcon: ({ color, size }) => <Icon name="message-circle" size={size} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}
