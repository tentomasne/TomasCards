declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_API_URL: string;
      EXPO_PUBLIC_API_KEY: string;
      EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID: string;
      EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS: string;
      EXPO_PUBLIC_DEBUG: string;
    }
  }
}

// Ensure this file is treated as a module
export {};