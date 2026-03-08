"use client";

import { useCallback, useEffect, useState } from "react";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";

interface PushNotificationState {
  permissionState: NotificationPermission | "unsupported";
  isSubscribed: boolean;
  isLoading: boolean;
  requestPermissionAndSubscribe: () => Promise<void>;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
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

export function usePushNotifications(): PushNotificationState {
  const [permissionState, setPermissionState] = useState<NotificationPermission | "unsupported">(
    "default",
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkState = async () => {
      if (!("Notification" in window) || !("serviceWorker" in navigator)) {
        setPermissionState("unsupported");
        setIsLoading(false);
        return;
      }

      setPermissionState(Notification.permission);

      if (Notification.permission === "granted") {
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          setIsSubscribed(subscription !== null);
        } catch {
          setIsSubscribed(false);
        }
      }

      setIsLoading(false);
    };

    checkState();
  }, []);

  const requestPermissionAndSubscribe = useCallback(async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      return;
    }

    const permission = await Notification.requestPermission();
    setPermissionState(permission);

    if (permission !== "granted") {
      return;
    }

    try {
      const { vapidPublicKey } = await stockControlApiClient.pushVapidKey();
      if (!vapidPublicKey) {
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const subscriptionJson = subscription.toJSON();
      await stockControlApiClient.subscribePush({
        endpoint: subscriptionJson.endpoint!,
        keys: {
          p256dh: subscriptionJson.keys!.p256dh!,
          auth: subscriptionJson.keys!.auth!,
        },
      });

      setIsSubscribed(true);
    } catch (error) {
      console.error("Failed to subscribe to push notifications:", error);
    }
  }, []);

  return { permissionState, isSubscribed, isLoading, requestPermissionAndSubscribe };
}
