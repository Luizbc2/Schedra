import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";

import { useAppTheme } from "../../theme/ThemeProvider";

const TRACK_WIDTH = 72;
const TRACK_HEIGHT = 36;
const TRACK_PADDING = 3;
const KNOB_SIZE = 28;
const KNOB_TRAVEL = TRACK_WIDTH - KNOB_SIZE - TRACK_PADDING * 2;

export function ThemeModeSwitch() {
  const { mode, toggleTheme } = useAppTheme();
  const progress = useRef(new Animated.Value(mode === "dark" ? 1 : 0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: mode === "dark" ? 1 : 0,
      damping: 17,
      stiffness: 185,
      mass: 0.72,
      useNativeDriver: false,
    }).start();
  }, [mode, progress]);

  const animatePress = (toValue: number) => {
    Animated.timing(pressScale, {
      toValue,
      duration: 110,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  };

  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, KNOB_TRAVEL] });
  const trackColor = progress.interpolate({ inputRange: [0, 1], outputRange: ["#F5C9D9", "#2C2433"] });
  const borderColor = progress.interpolate({ inputRange: [0, 1], outputRange: ["#E9A8C0", "#57455F"] });
  const knobColor = progress.interpolate({ inputRange: [0, 1], outputRange: ["#FFF7D7", "#F4F0FF"] });
  const dayOpacity = progress.interpolate({ inputRange: [0, 0.42, 1], outputRange: [1, 0.16, 0] });
  const nightOpacity = progress.interpolate({ inputRange: [0, 0.58, 1], outputRange: [0, 0.16, 1] });
  const sunRotation = progress.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "120deg"] });
  const moonRotation = progress.interpolate({ inputRange: [0, 1], outputRange: ["-75deg", "0deg"] });

  return (
    <Pressable
      accessibilityLabel={mode === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
      accessibilityRole="switch"
      accessibilityState={{ checked: mode === "dark" }}
      hitSlop={8}
      onPress={toggleTheme}
      onPressIn={() => animatePress(0.95)}
      onPressOut={() => animatePress(1)}
      style={styles.pressable}
    >
      <Animated.View style={[styles.track, { backgroundColor: trackColor, borderColor, transform: [{ scale: pressScale }] }]}>
        <Animated.View pointerEvents="none" style={[styles.dayDecor, { opacity: dayOpacity }]}>
          <Ionicons name="cloud" size={10} color="rgba(255,255,255,0.84)" />
          <View style={styles.dayDot} />
        </Animated.View>

        <Animated.View pointerEvents="none" style={[styles.nightDecor, { opacity: nightOpacity }]}>
          <View style={[styles.star, styles.starLarge]} />
          <View style={[styles.star, styles.starMiddle]} />
          <View style={[styles.star, styles.starSmall]} />
        </Animated.View>

        <Animated.View style={[styles.knob, { backgroundColor: knobColor, transform: [{ translateX }] }]}>
          <Animated.View style={[styles.symbol, { opacity: dayOpacity, transform: [{ rotate: sunRotation }] }]}>
            <Ionicons name="sunny" size={19} color="#E9A91A" />
          </Animated.View>
          <Animated.View style={[styles.symbol, { opacity: nightOpacity, transform: [{ rotate: moonRotation }] }]}>
            <Ionicons name="moon" size={17} color="#7A64BE" />
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: { width: TRACK_WIDTH, height: TRACK_HEIGHT, alignItems: "center", justifyContent: "center" },
  track: { width: TRACK_WIDTH, height: TRACK_HEIGHT, borderWidth: 1, borderRadius: TRACK_HEIGHT / 2, padding: TRACK_PADDING, justifyContent: "center", overflow: "hidden" },
  dayDecor: { position: "absolute", right: 8, top: 7, width: 24, height: 21 },
  dayDot: { position: "absolute", right: 1, bottom: 2, width: 3, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.72)" },
  nightDecor: { position: "absolute", left: 8, top: 7, width: 24, height: 22 },
  star: { position: "absolute", borderRadius: 4, backgroundColor: "#E9DFFF" },
  starLarge: { width: 4, height: 4, left: 1, top: 3 },
  starMiddle: { width: 3, height: 3, right: 2, top: 1 },
  starSmall: { width: 2, height: 2, left: 11, bottom: 2 },
  knob: { width: KNOB_SIZE, height: KNOB_SIZE, borderRadius: KNOB_SIZE / 2, alignItems: "center", justifyContent: "center", shadowColor: "#140F17", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3 },
  symbol: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});
