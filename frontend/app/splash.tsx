import React, { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/auth-context";
import { SplashBackdrop } from "@/src/components/splash-backdrop";

export default function Splash() {
  const router = useRouter();
  const { user, loading } = useAuth();
  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      router.replace(user ? "/(tabs)" : "/(auth)/sign-in");
    }, 1600);
    return () => clearTimeout(timer);
  }, [loading, user, router]);
  return <SplashBackdrop />;
}
