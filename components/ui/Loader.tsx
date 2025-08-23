import { Image } from "expo-image";
import React, { useEffect, useState } from "react";
import { Platform, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import logo from "../../assets/images/logo.png";

interface LoaderProps {
  size?: "small" | "medium" | "large" | "fullscreen";
  text?: string;
  showText?: boolean;
}

export default function Loader({
  size = "medium",
  text = "Caricamento...",
  showText = true,
}: LoaderProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  // Timeout per mostrare il fallback se il logo non si carica entro 2 secondi
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!imageLoaded && !imageError) {
        setShowFallback(true);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [imageLoaded, imageError]);

  // Reset degli stati quando il componente si monta
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
    setShowFallback(false);
  }, []);

  // Valori animati ottimizzati
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);

  // Avvia le animazioni solo quando necessario
  React.useEffect(() => {
    // Rotazione continua con timing ottimizzato
    rotation.value = withRepeat(
      withTiming(360, { duration: 1500 }), // Ridotto da 2000ms a 1500ms
      -1, 
      false
    );

    // Effetto pulse più leggero
    scale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 600 }), // Ridotto da 1.1 a 1.05 e da 800ms a 600ms
        withTiming(1, { duration: 600 })
      ),
      -1, 
      true
    );
  }, []);

  // Stili animati
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }, { scale: scale.value }],
    };
  });

  // Configurazioni dimensioni
  const sizeConfig = {
    small: {
      container: "p-4",
      logoSize: 40,
      textSize: "text-sm",
    },
    medium: {
      container: "p-6",
      logoSize: 60,
      textSize: "text-base",
    },
    large: {
      container: "p-8",
      logoSize: 80,
      textSize: "text-lg",
    },
    fullscreen: {
      container: "flex-1 items-center justify-center bg-white p-8",
      logoSize: 120,
      textSize: "text-xl",
    },
  };

  const config = sizeConfig[size];

  // Fallback per il logo se non si carica
  const renderLogo = () => {
    // Mostra fallback se c'è un errore o se è passato il timeout
    if (imageError || showFallback) {
      // Fallback con testo stilizzato
      return (
        <View
          style={{
            width: config.logoSize,
            height: config.logoSize,
            borderRadius: config.logoSize / 2,
            backgroundColor: "#f97316",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: "white",
              fontSize: config.logoSize * 0.3,
              fontWeight: "bold",
            }}
          >
            P
          </Text>
        </View>
      );
    }

    return (
      <Image
        source={logo}
        style={{
          width: config.logoSize,
          height: config.logoSize,
          opacity: imageLoaded ? 1 : 0,
        }}
        contentFit="contain"
        onLoad={() => {
          setImageLoaded(true);
          setShowFallback(false);
        }}
        onError={() => {
          setImageError(true);
          setShowFallback(true);
        }}
        transition={200}
      />
    );
  };

  // Per fullscreen su web, usiamo un layout ottimizzato
  if (size === "fullscreen" && Platform.OS === "web") {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "white",
          zIndex: 9999,
          minHeight: "100vh",
          width: "100vw",
        }}
      >
        {/* Effetto glow semplificato */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: config.logoSize + 20, // Ridotto da +40 a +20
            height: config.logoSize + 20,
            borderRadius: "50%",
            backgroundColor: "rgba(249, 115, 22, 0.05)", // Ridotto opacity da 0.1 a 0.05
            opacity: 0.3, // Ridotto da 0.6 a 0.3
            zIndex: -1,
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          <Animated.View style={animatedStyle}>
            {renderLogo()}
          </Animated.View>

          {showText && (
            <Text
              className={`${config.textSize} text-gray-600 mt-4 text-center font-medium`}
            >
              {text}
            </Text>
          )}
        </div>
      </div>
    );
  }

  // Stili container per mobile e altre size
  const containerStyle =
    size === "fullscreen"
      ? {
          flex: 1,
          justifyContent: "center" as const,
          alignItems: "center" as const,
          backgroundColor: "white",
          padding: 32,
        }
      : {};

  return (
    <View style={containerStyle} className={config.container}>
      <Animated.View style={animatedStyle}>
        {renderLogo()}
      </Animated.View>

      {showText && (
        <Text className={`${config.textSize} text-gray-600 mt-4 text-center`}>
          {text}
        </Text>
      )}
    </View>
  );
}
