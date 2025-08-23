import { ConfigContext, ExpoConfig } from 'expo/config';
import { version } from './package.json';

const IS_DEV = process.env.APP_ENV === 'development';
const IS_PREVIEW = process.env.APP_ENV === 'preview';

const EAS_PROJECT_ID = 'b6532ec2-cf19-4f72-bdc3-89504819876d'
const PROJECT_SLUG = 'pizzaurum';
const OWNER = 'bbartoz';

const APP_NAME = 'Pizzaurum';
const BUNDLE_IDENTIFIER = "com.bbartoz.pizzaurum";
const PACKAGE_NAME = "com.bbartoz.pizzaurum";
const ICON = "./assets/expo/ios-light.png";
const ADAPTIVE_ICON = "./assets/expo/adaptive-icon.png";
const SCHEME = "app-scheme";

export default ({ config }: ConfigContext ): ExpoConfig => {
  const buildProfile = process.env.EAS_BUILD_PROFILE;
  const environment = process.env.APP_ENV || buildProfile || 'development';

  const { 
    name,
    bundleIdentifier,
    icon,
    adaptiveIcon,
    packageName,
    scheme 
  } = 
    getDynamicAppConfig(
      environment as "development" | "preview" | "production"
    )

  return {
    ...config,
    name: name,
    version,
    slug: PROJECT_SLUG,
    orientation: "portrait",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    icon: icon,
    scheme: scheme,
    ios: {
      supportsTablet: false,
      bundleIdentifier: bundleIdentifier,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true,
          NSExceptionDomains: {
            "localhost": {
              NSExceptionAllowsInsecureHTTPLoads: true
            }
          }
        },
        CFBundleURLTypes: [
          {
            CFBundleURLName: "app-scheme",
            CFBundleURLSchemes: [scheme]
          }
        ]
      },
      entitlements: {
        "com.apple.developer.in-app-payments": [
          "merchant.pizzaurum.com"
        ],
        "aps-environment": environment === "development" ? "development" : "production"
      },
      // Configurazione aggiuntiva per le notifiche
      associatedDomains: [
        "applinks:pizzaurum.store"
      ]
    },
    android: {
      adaptiveIcon: {
        foregroundImage: adaptiveIcon,
        backgroundColor: "#ffffff",
      },
      package: packageName
    },
    updates: {
      url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
    },
    runtimeVersion: version,
    web: {
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
        }
      },
      bundler: 'metro',
      output: 'server',
      favicon: './assets/images/logo.png'
    },
    plugins: [
      'expo-router',
      'expo-font',
      'expo-dev-client',
      [
        "expo-notifications",
        {
          icon: "./assets/expo/ios-light.png",
          color: "#ffffff",
          sounds: ["./assets/notification.wav"]
        }
      ],
      [
        "expo-splash-screen",
        {
          image: "./assets/expo/splash-icon-dark.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            image: "./assets/expo/splash-icon-light.png",
            backgroundColor: "#000000",
          },
        },
      ],
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      eas: {
        projectId: EAS_PROJECT_ID
      }
    },
    owner: OWNER
  }
}

export const getDynamicAppConfig = (
  environment: "development" | "preview" | "production"
) => {
  if (environment === "production") {
    return {
      name: APP_NAME,
      bundleIdentifier: BUNDLE_IDENTIFIER,
      packageName: PACKAGE_NAME,
      icon: ICON,
      adaptiveIcon: ADAPTIVE_ICON,
      scheme: SCHEME,
    };
  }

  if (environment === "preview") {
    return {
      name: `${APP_NAME} Preview`,
      bundleIdentifier: `${BUNDLE_IDENTIFIER}.preview`,
      packageName: `${PACKAGE_NAME}.preview`,
      icon: "./assets/expo/ios-light.png",
      adaptiveIcon: ADAPTIVE_ICON,
      scheme: `${SCHEME}-prev`,
    };
  }

  return {
    name: `${APP_NAME} Dev`,
    bundleIdentifier: `${BUNDLE_IDENTIFIER}.dev`,
    packageName: `${PACKAGE_NAME}.dev`,
    icon: "./assets/expo/ios-light.png",
    adaptiveIcon: ADAPTIVE_ICON,
    scheme: `${SCHEME}-dev`,
  };
};