import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";

import { useAppTheme } from "../../../theme/ThemeProvider";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ActionPressableProps = Omit<PressableProps, "children" | "style"> & {
  children: React.ReactNode;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function ActionPressable({
  children, loading = false, disabled = false, style, accessibilityState,
  onPress, onPressIn, onPressOut, onHoverIn, onHoverOut, onFocus, onBlur, ...props
}: ActionPressableProps) {
  const { colors } = useAppTheme();
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(true);
  const scale = useRef(new Animated.Value(1)).current;
  const blocked = disabled || loading;

  useEffect(() => {
    let active = true;
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) setReduceMotion(value);
    }).catch(() => {});
    return () => { active = false; subscription?.remove(); };
  }, []);

  useEffect(() => {
    if (reduceMotion || blocked) {
      scale.stopAnimation();
      scale.setValue(1);
      return;
    }
    const animation = Animated.timing(scale, {
      toValue: pressed ? 0.98 : hovered ? 1.015 : 1,
      duration: 140,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [blocked, hovered, pressed, reduceMotion, scale]);

  return (
    <AnimatedPressable
      {...props}
      accessibilityRole="button"
      accessibilityState={{ ...accessibilityState, disabled: blocked, busy: loading }}
      aria-busy={loading}
      aria-disabled={blocked}
      disabled={blocked}
      onPress={(event) => { if (!blocked) onPress?.(event); }}
      onPressIn={(event) => { setPressed(true); onPressIn?.(event); }}
      onPressOut={(event) => { setPressed(false); onPressOut?.(event); }}
      onHoverIn={(event) => { setHovered(true); onHoverIn?.(event); }}
      onHoverOut={(event) => { setHovered(false); onHoverOut?.(event); }}
      onFocus={(event) => { setFocused(true); onFocus?.(event); }}
      onBlur={(event) => { setFocused(false); onBlur?.(event); }}
      style={[style, focused && { borderColor: colors.text }, {
        opacity: blocked ? 0.55 : pressed ? 0.86 : 1,
        transform: [{ scale }],
      }]}
    >
      {children}
    </AnimatedPressable>
  );
}
