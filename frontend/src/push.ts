import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as SecureStore from "expo-secure-store";
import { NotificationsAPI } from "./api";

const KEY = "waddleplay_push_device";
export async function registerPush(requestPermission = false): Promise<string> {
  if (Platform.OS === "web") return "Preferences saved. Web push is not enabled; updates remain available in the app.";
  if (!Device.isDevice) return "Preferences saved. Push notifications require a physical device.";
  const Notifications = await import("expo-notifications");
  if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("default", { name: "WaddlePlay updates", importance: Notifications.AndroidImportance.DEFAULT, lightColor: "#48866F" });
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && requestPermission) permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) return "Preferences saved. Enable notification permission in your device settings to receive alerts.";
  const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
  if (!projectId) throw new Error("Push setup is missing its Expo project ID.");
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  await NotificationsAPI.register(token, Platform.OS);
  await SecureStore.setItemAsync(KEY, token);
  return "Notification preferences saved. Push alerts are enabled.";
}
export async function unregisterPush() {
  if (Platform.OS === "web") return;
  const token = await SecureStore.getItemAsync(KEY);
  if (token) await NotificationsAPI.unregister(token);
  await SecureStore.deleteItemAsync(KEY);
}
