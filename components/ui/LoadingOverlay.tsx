import React from "react";
import { Modal, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Loader from "./Loader";

interface LoadingOverlayProps {
  visible: boolean;
  text?: string;
  transparent?: boolean;
}

export default function LoadingOverlay({
  visible,
  text = "Caricamento...",
  transparent = false,
}: LoadingOverlayProps) {
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      statusBarTranslucent={true}
    >
      <Animated.View
        style={[animatedStyle]}
        className={`flex-1 items-center justify-center ${
          transparent ? "bg-black/30" : "bg-white"
        }`}
      >
        {transparent ? (
          <View className="bg-white rounded-xl p-6 shadow-lg">
            <Loader size="large" text={text} />
          </View>
        ) : (
          <Loader size="fullscreen" text={text} />
        )}
      </Animated.View>
    </Modal>
  );
}
