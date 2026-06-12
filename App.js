import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { GameProvider } from './src/state/GameContext';
import HomeScreen from './src/screens/HomeScreen';
import BriefingScreen from './src/screens/BriefingScreen';
import ComposeScreen from './src/screens/ComposeScreen';
import EventResultScreen from './src/screens/EventResultScreen';
import SeasonStandingsScreen from './src/screens/SeasonStandingsScreen';
import { colors } from './src/ui/theme';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <GameProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text, contentStyle: { backgroundColor: colors.bg } }}>
            <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Super Fantasy Bike Trial' }} />
            <Stack.Screen name="Briefing" component={BriefingScreen} options={{ title: 'Briefing' }} />
            <Stack.Screen name="Compose" component={ComposeScreen} options={{ title: 'Mon équipe' }} />
            <Stack.Screen name="EventResult" component={EventResultScreen} options={{ title: 'Résultats', headerBackVisible: false }} />
            <Stack.Screen name="SeasonStandings" component={SeasonStandingsScreen} options={{ title: 'Classement saison', headerBackVisible: false }} />
          </Stack.Navigator>
        </NavigationContainer>
      </GameProvider>
    </SafeAreaProvider>
  );
}
