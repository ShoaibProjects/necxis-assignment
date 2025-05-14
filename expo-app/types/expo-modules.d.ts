// types/expo-modules.d.ts
// Add this file to your project to resolve TypeScript module declaration issues

declare module 'expo-device' {
  export enum DeviceType {
    UNKNOWN = 0,
    PHONE = 1,
    TABLET = 2,
    DESKTOP = 3,
    TV = 4,
  }

  export function isDevice(): boolean;
  export function getDeviceTypeAsync(): Promise<DeviceType>;
  export function getModelAsync(): Promise<string | null>;
  export function getManufacturerAsync(): Promise<string | null>;
  // Add other functions you need
}

declare module 'expo-constants' {
  interface Constants {
    expoConfig?: {
      extra?: {
        eas?: {
          projectId?: string;
        };
      };
    };
  }

  const Constants: Constants;
  export default Constants;
}

declare module 'expo-notifications' {
  export interface NotificationRequest {
    identifier: string;
    content: {
      title?: string;
      subtitle?: string;
      body?: string;
      data?: any;
    };
    trigger: any;
  }

  export interface Notification {
    date: number;
    request: NotificationRequest;
  }

  export interface NotificationResponse {
    notification: Notification;
    actionIdentifier: string;
  }

  export enum AndroidImportance {
    DEFAULT = 3,
    MIN = 1,
    LOW = 2,
    HIGH = 4,
    MAX = 5,
  }

  export function setNotificationHandler(handler: {
    handleNotification: (notification: Notification) => Promise<{
      shouldShowAlert?: boolean;
      shouldPlaySound?: boolean;
      shouldSetBadge?: boolean;
      priority?: string;
    }>;
  }): void;

  export function addNotificationReceivedListener(
    listener: (notification: Notification) => void
  ): { remove: () => void };

  export function addNotificationResponseReceivedListener(
    listener: (response: NotificationResponse) => void
  ): { remove: () => void };

  export function removeNotificationSubscription(subscription: { remove: () => void }): void;

  export function getPermissionsAsync(): Promise<{ status: string; granted: boolean }>;
  export function requestPermissionsAsync(): Promise<{ status: string; granted: boolean }>;
  
  export function getExpoPushTokenAsync(options?: {
    projectId?: string;
  }): Promise<{ data: string }>;

  export function setNotificationChannelAsync(
    channelId: string,
    channelConfig: {
      name: string;
      importance: AndroidImportance;
      vibrationPattern?: number[];
      lightColor?: string;
    }
  ): Promise<void>;
}