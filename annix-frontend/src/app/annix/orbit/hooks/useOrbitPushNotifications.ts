"use client";

import { useCallback, useEffect, useState } from "react";
import { annixOrbitApiClient } from "@/app/lib/api/annixOrbitApi";

interface OrbitPushState {
  permissionState: NotificationPermission | "unsupported";
  isSubscribed: boolean;
  requestPermissionAndSubscribe: () => Promise<boolean>;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  rawData.split("").forEach((char, i) => {
    outputArray[i] = char.charCodeAt(0);
  });
  return outputArray;
}

function pushUnsupported(): boolean {
  // eslint-disable-next-line no-restricted-syntax -- SSR/feature guard; isUndefined(window) would throw
  if (typeof window === "undefined") return true;
  return !("Notification" in window) || !("serviceWorker" in navigator);
}

export function useOrbitPushNotifications(): OrbitPushState {
  const [permissionState, setPermissionState] = useState<NotificationPermission | "unsupported">(
    "default",
  );
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (pushUnsupported()) {
      setPermissionState("unsupported");
      return;
    }
    setPermissionState(Notification.permission);
    if (Notification.permission === "granted") {
      navigator.serviceWorker.ready
        .then((registration) => registration.pushManager.getSubscription())
        .then((subscription) => setIsSubscribed(subscription !== null))
        .catch(() => setIsSubscribed(false));
    }
  }, []);

  const requestPermissionAndSubscribe = useCallback(async (): Promise<boolean> => {
    if (pushUnsupported()) return false;

    let permission: NotificationPermission;
    try {
      permission = await Notification.requestPermission();
    } catch {
      return false;
    }
    setPermissionState(permission);
    if (permission !== "granted") return false;

    try {
      const vapid = await annixOrbitApiClient.notificationVapidKey();
      const key = vapid.key;
      if (!key) return false;

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key),
        }));

      const json = subscription.toJSON();
      const endpoint = json.endpoint;
      const keys = json.keys;
      if (!endpoint || !keys) return false;

      await annixOrbitApiClient.subscribePush({
        endpoint,
        keys: { p256dh: keys.p256dh as string, auth: keys.auth as string },
      });
      setIsSubscribed(true);
      return true;
    } catch (error) {
      console.warn("Orbit push subscribe failed:", error);
      return false;
    }
  }, []);

  return { permissionState, isSubscribed, requestPermissionAndSubscribe };
}
