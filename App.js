import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { GameProvider } from './src/state/GameContext';
import SeasonHomeScreen from './src/screens/SeasonHomeScreen';
import BriefingScreen from './src/screens/BriefingScreen';
import ComposeScreen from './src/screens/ComposeScreen';
import EventResultScreen from './src/screens/EventResultScreen';
import StandingsScreen from './src/screens/StandingsScreen';
import SeasonListScreen from './src/screens/SeasonListScreen';
import SeasonDetailScreen from './src/screens/SeasonDetailScreen';
import RulesScreen from './src/screens/RulesScreen';
import CollectionScreen from './src/screens/CollectionScreen';
import PackRevealScreen from './src/screens/PackRevealScreen';
import CardDetailScreen from './src/screens/CardDetailScreen';
import { colors } from './src/ui/theme';

const Tab = createBottomTabNavigator();
const PlayStack = createNativeStackNavigator();
const StandingsStack = createNativeStackNavigator();
const HistoryStack = createNativeStackNavigator();
const RulesStack = createNativeStackNavigator();
const CollectionStack = createNativeStackNavigator();

const stackOptions = { headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text, contentStyle: { backgroundColor: colors.bg } };

function CollectionNav() {
  return (
    <CollectionStack.Navigator screenOptions={stackOptions}>
      <CollectionStack.Screen name="Collection" component={CollectionScreen} options={{ title: 'Ma collection' }} />
      <CollectionStack.Screen name="PackReveal" component={PackRevealScreen} options={{ title: 'Ouverture' }} />
      <CollectionStack.Screen name="CardDetail" component={CardDetailScreen} options={{ title: 'Carte' }} />
    </CollectionStack.Navigator>
  );
}

function PlayNav() {
  return (
    <PlayStack.Navigator screenOptions={stackOptions}>
      <PlayStack.Screen name="SeasonHome" component={SeasonHomeScreen} options={{ title: 'Super Fantasy Bike Trial' }} />
      <PlayStack.Screen name="Briefing" component={BriefingScreen} options={{ title: 'Briefing' }} />
      <PlayStack.Screen name="Compose" component={ComposeScreen} options={{ title: 'Mon équipe' }} />
      <PlayStack.Screen name="EventResult" component={EventResultScreen} options={{ title: 'Résultats' }} />
    </PlayStack.Navigator>
  );
}

function StandingsNav() {
  return (
    <StandingsStack.Navigator screenOptions={stackOptions}>
      <StandingsStack.Screen name="Standings" component={StandingsScreen} options={{ title: 'Classement saison' }} />
    </StandingsStack.Navigator>
  );
}

function HistoryNav() {
  return (
    <HistoryStack.Navigator screenOptions={stackOptions}>
      <HistoryStack.Screen name="SeasonList" component={SeasonListScreen} options={{ title: 'Historique' }} />
      <HistoryStack.Screen name="SeasonDetail" component={SeasonDetailScreen} options={{ title: 'Saison' }} />
      <HistoryStack.Screen name="EventResult" component={EventResultScreen} options={{ title: 'Résultats' }} />
    </HistoryStack.Navigator>
  );
}

function RulesNav() {
  return (
    <RulesStack.Navigator screenOptions={stackOptions}>
      <RulesStack.Screen name="Rules" component={RulesScreen} options={{ title: 'Règles & profil' }} />
    </RulesStack.Navigator>
  );
}

const icon = (glyph) => () => <Text style={{ fontSize: 18 }}>{glyph}</Text>;
const tab = (title, glyph) => ({ title, tabBarIcon: icon(glyph), tabBarAccessibilityLabel: `Onglet ${title}` });

export default function App() {
  return (
    <SafeAreaProvider>
      <GameProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary }}>
            <Tab.Screen name="PlayTab" component={PlayNav} options={tab('Jouer', '🎮')} />
            <Tab.Screen name="CollectionTab" component={CollectionNav} options={tab('Collection', '🃏')} />
            <Tab.Screen name="StandingsTab" component={StandingsNav} options={tab('Classement', '🏆')} />
            <Tab.Screen name="HistoryTab" component={HistoryNav} options={tab('Historique', '📜')} />
            <Tab.Screen name="RulesTab" component={RulesNav} options={tab('Règles', '📖')} />
          </Tab.Navigator>
        </NavigationContainer>
      </GameProvider>
    </SafeAreaProvider>
  );
}
