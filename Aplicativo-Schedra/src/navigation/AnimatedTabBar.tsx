import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "../theme/ThemeProvider";
import { fonts } from "../theme/tokens";
import type { MainTabParamList } from "./types";

const tabIcons: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
  Agenda: "time-outline",
  Clientes: "people-outline",
  Profissionais: "briefcase-outline",
  Servicos: "cut-outline",
  Mais: "ellipsis-horizontal-circle-outline",
};

const tabLabels: Record<keyof MainTabParamList, string> = {
  Agenda: "Agenda",
  Clientes: "Clientes",
  Profissionais: "Profissionais",
  Servicos: "Serviços",
  Mais: "Mais",
};

export function AnimatedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);
  const indicatorX = useRef(new Animated.Value(0)).current;
  const itemWidth = barWidth > 0 ? barWidth / state.routes.length : 0;

  useEffect(() => {
    if (!itemWidth) return;

    Animated.spring(indicatorX, {
      toValue: state.index * itemWidth,
      damping: 19,
      stiffness: 190,
      mass: 0.85,
      useNativeDriver: true,
    }).start();
  }, [indicatorX, itemWidth, state.index]);

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, 8),
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      ]}
    >
      <View
        onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
        style={[styles.track, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}
      >
        {itemWidth > 0 && (
          <Animated.View
            style={[
              styles.indicator,
              {
                width: itemWidth - 6,
                backgroundColor: colors.accentSoft,
                borderColor: colors.accent,
                transform: [{ translateX: indicatorX }],
              },
            ]}
          />
        )}

        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const descriptor = descriptors[route.key];
          const tabName = route.name as keyof MainTabParamList;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: "tabLongPress", target: route.key });
          };

          return (
            <AnimatedTabItem
              key={route.key}
              accessibilityLabel={descriptor.options.tabBarAccessibilityLabel}
              focused={focused}
              icon={tabIcons[tabName]}
              label={tabLabels[tabName]}
              onLongPress={onLongPress}
              onPress={onPress}
            />
          );
        })}
      </View>
    </View>
  );
}

function AnimatedTabItem({
  accessibilityLabel,
  focused,
  icon,
  label,
  onLongPress,
  onPress,
}: {
  accessibilityLabel?: string;
  focused: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onLongPress: () => void;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  const focusProgress = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(focusProgress, {
      toValue: focused ? 1 : 0,
      damping: 16,
      stiffness: 220,
      mass: 0.65,
      useNativeDriver: true,
    }).start();
  }, [focusProgress, focused]);

  const scale = focusProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });
  const translateY = focusProgress.interpolate({ inputRange: [0, 1], outputRange: [3, 2] });
  const color = focused ? colors.accent : colors.textMuted;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      onLongPress={onLongPress}
      onPress={onPress}
      style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
    >
      <Animated.View style={[styles.tabContent, { transform: [{ translateY }, { scale }] }]}>
        <Ionicons
          name={focused ? icon.replace("-outline", "") as keyof typeof Ionicons.glyphMap : icon}
          color={color}
          size={20}
        />
        <Text numberOfLines={1} style={[styles.label, { color }]}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { borderTopWidth: 1, paddingHorizontal: 8, paddingTop: 7 },
  track: { height: 56, borderWidth: 1, borderRadius: 8, flexDirection: "row", position: "relative", overflow: "hidden" },
  indicator: { position: "absolute", left: 3, top: 3, bottom: 3, borderWidth: 1, borderRadius: 6 },
  tab: { flex: 1, minWidth: 0, alignItems: "center", justifyContent: "center", zIndex: 1 },
  tabContent: { alignItems: "center", justifyContent: "center", gap: 3 },
  label: { maxWidth: "100%", fontFamily: fonts.bodyMedium, fontSize: 9 },
  pressed: { opacity: 0.68 },
});
