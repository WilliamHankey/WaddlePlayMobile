import { useEffect } from "react";
import type { NotificationResponse } from "expo-notifications";
import { Platform } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/auth-context";
import { queryClient } from "@/src/query-client";
import { registerPush } from "@/src/push";

export function PushListener() {
  const { user } = useAuth();
  const router = useRouter();
  const userId = user?.id;
  useEffect(() => {
    if (!userId || Platform.OS === "web") return;
    let active = true;
    const cleanups: (() => void)[] = [];
    import("expo-notifications").then(async Notifications => {
      if (!active) return;
      Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }) });
      const routeResponse = (response: NotificationResponse) => {
        const route = response.notification.request.content.data?.route;
        if (active && typeof route === "string" && /^(\/messages\/[\w-]+|\/playdate\/[\w-]+|\/verification)$/.test(route)) router.push(route as any);
      };
      const received = Notifications.addNotificationReceivedListener(() => { queryClient.invalidateQueries({ queryKey: ["notifications"] }); queryClient.invalidateQueries({ queryKey: ["threads"] }); });
      const response = Notifications.addNotificationResponseReceivedListener(routeResponse);
      cleanups.push(() => received.remove(), () => response.remove());
      const last = await Notifications.getLastNotificationResponseAsync();
      if (last && active) { routeResponse(last); await Notifications.clearLastNotificationResponseAsync(); }
      await registerPush(false);
    }).catch(() => { /* Explicit Settings action reports registration/setup failures. */ });
    return () => { active = false; cleanups.forEach(fn => fn()); };
  }, [userId, router]);
  return null;
}
