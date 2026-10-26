import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, Animated, View } from "react-native";

import { AgendaScreen } from "../features/agenda/screens/AgendaScreen";
import { AuthScreen } from "../features/auth/screens/AuthScreen";
import { useAuth } from "../features/auth/AuthProvider";
import { CatalogScreen } from "../features/catalog/screens/CatalogScreen";
import { ProfileScreen } from "../features/profile/screens/ProfileScreen";
import { AdminUsersScreen } from "../features/admin/screens/AdminUsersScreen";
import { useAppTheme } from "../theme/ThemeProvider";
import { AnimatedTabBar } from "./AnimatedTabBar";
import type { MainTabParamList, MoreStackParamList, RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const MoreStack = createNativeStackNavigator<MoreStackParamList>();

function MoreNavigator() {
  return (
    <MoreStack.Navigator screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <MoreStack.Screen name="MoreHome">
        {({ navigation }) => <ProfileScreen onOpenAdmin={() => navigation.navigate("AdminUsers")} />}
      </MoreStack.Screen>
      <MoreStack.Screen name="AdminUsers">
        {({ navigation }) => <AdminUsersScreen onBack={() => navigation.goBack()} />}
      </MoreStack.Screen>
    </MoreStack.Navigator>
  );
}

function MainTabs() {
  const { workspaceMode } = useAuth();

  return (
    <Tab.Navigator
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        animation: "shift",
      }}
    >
      <Tab.Screen name="Agenda" component={AgendaScreen} />
      {workspaceMode === "business" && <Tab.Screen name="Clientes">{() => <CatalogScreen kind="clients" />}</Tab.Screen>}
      {workspaceMode === "business" && <Tab.Screen name="Profissionais">{() => <CatalogScreen kind="professionals" />}</Tab.Screen>}
      {workspaceMode === "business" && <Tab.Screen name="Servicos">{() => <CatalogScreen kind="services" />}</Tab.Screen>}
      <Tab.Screen name="Mais" component={MoreNavigator} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { loading, modeTransition, token } = useAuth();
  const { colors } = useAppTheme();

  if (loading) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}><ActivityIndicator color={colors.accent} /></View>;

  const rotateY = modeTransition.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ["-88deg", "0deg", "88deg"],
  });
  const translateX = modeTransition.interpolate({ inputRange: [-1, 0, 1], outputRange: [-14, 0, 14] });
  const scale = modeTransition.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.965, 1, 0.965] });
  const opacity = modeTransition.interpolate({
    inputRange: [-1, -0.7, 0, 0.7, 1],
    outputRange: [0.08, 0.72, 1, 0.72, 0.08],
  });

  return <Animated.View style={{ flex: 1, backgroundColor: colors.background, backfaceVisibility: "hidden", opacity, transform: [{ perspective: 1100 }, { translateX }, { rotateY }, { scale }] }}>
    <Stack.Navigator screenOptions={{ headerShown: false, animation: "fade" }}>
      {token ? <Stack.Screen name="Main" component={MainTabs} /> : <Stack.Screen name="Welcome" component={AuthScreen} />}
    </Stack.Navigator>
  </Animated.View>;
}
