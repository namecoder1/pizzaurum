import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// Custom storage implementation for React Native
export const createAsyncStorage = () => {
  if (Platform.OS === "web") {
    // On web, use localStorage
    return {
      getItem: (key: string) => {
        try {
          return Promise.resolve(localStorage.getItem(key));
        } catch (error) {
          return Promise.resolve(null);
        }
      },
      setItem: (key: string, value: string) => {
        try {
          localStorage.setItem(key, value);
          return Promise.resolve();
        } catch (error) {
          return Promise.resolve();
        }
      },
      removeItem: (key: string) => {
        try {
          localStorage.removeItem(key);
          return Promise.resolve();
        } catch (error) {
          return Promise.resolve();
        }
      },
      getAllKeys: () => {
        try {
          return Promise.resolve(Object.keys(localStorage));
        } catch (error) {
          return Promise.resolve([]);
        }
      },
      multiRemove: (keys: string[]) => {
        try {
          keys.forEach(key => localStorage.removeItem(key));
          return Promise.resolve();
        } catch (error) {
          return Promise.resolve();
        }
      },
    };
  } else {
    // On React Native, use AsyncStorage directly
    return {
      getItem: (key: string) => AsyncStorage.getItem(key),
      setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
      removeItem: (key: string) => AsyncStorage.removeItem(key),
      getAllKeys: () => AsyncStorage.getAllKeys(),
      multiRemove: (keys: string[]) => AsyncStorage.multiRemove(keys),
    };
  }
};
