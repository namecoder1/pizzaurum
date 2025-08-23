import React from "react";
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import Loader from "./Loader";

interface FullScreenLoaderProps {
  visible: boolean;
  text?: string;
  onHidden?: () => void;
}

export default function FullScreenLoader({
  visible,
  text = "Caricamento...",
  onHidden,
}: FullScreenLoaderProps) {
  const opacity = useSharedValue(visible ? 1 : 0);

  React.useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      opacity.value = withTiming(0, { duration: 200 }, () => {
        if (onHidden) {
          runOnJS(onHidden)();
        }
      });
    }
  }, [visible, opacity, onHidden]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!visible && opacity.value === 0) {
    return null;
  }

  return (
    <Animated.View 
      style={[
        animatedStyle,
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
        }
      ]}
    >
      <Loader size="fullscreen" text={text} />
    </Animated.View>
  );
}
