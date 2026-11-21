import React from 'react';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';
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
import AccountScreen from './src/screens/AccountScreen';
import { LanguageGate } from './src/i18n/LanguageGate';
import { linking } from './src/navigation/linking';
import { colors } from './src/ui/theme';

const Tab = createBottomTabNavigator();
const PlayStack = createNativeStackNavigator();
const StandingsStack = createNativeStackNavigator();
const HistoryStack = createNativeStackNavigator();
const RulesStack = createNativeStackNavigator();
const CollectionStack = createNativeStackNavigator();

const stackOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.text,
  contentStyle: { backgroundColor: colors.bg },
};

function CollectionNav() {
  const { t } = useTranslation();
  return (
    <CollectionStack.Navigator screenOptions={stackOptions}>
      <CollectionStack.Screen name="Collection" component={CollectionScreen} options={{ title: t('nav.collection') }} />
      <CollectionStack.Screen name="PackReveal" component={PackRevealScreen} options={{ title: t('nav.packReveal') }} />
      <CollectionStack.Screen name="CardDetail" component={CardDetailScreen} options={{ title: t('nav.cardDetail') }} />
    </CollectionStack.Navigator>
  );
}

function PlayNav() {
  const { t } = useTranslation();
  return (
    <PlayStack.Navigator screenOptions={stackOptions}>
      <PlayStack.Screen
        name="SeasonHome"
        component={SeasonHomeScreen}
        options={{ title: 'Super Fantasy Bike Trial' }}
      />
      <PlayStack.Screen name="Briefing" component={BriefingScreen} options={{ title: t('nav.briefing') }} />
      <PlayStack.Screen name="Compose" component={ComposeScreen} options={{ title: t('nav.compose') }} />
      <PlayStack.Screen name="EventResult" component={EventResultScreen} options={{ title: t('nav.eventResult') }} />
    </PlayStack.Navigator>
  );
}

function StandingsNav() {
  const { t } = useTranslation();
  return (
    <StandingsStack.Navigator screenOptions={stackOptions}>
      <StandingsStack.Screen name="Standings" component={StandingsScreen} options={{ title: t('nav.standings') }} />
    </StandingsStack.Navigator>
  );
}

function HistoryNav() {
  const { t } = useTranslation();
  return (
    <HistoryStack.Navigator screenOptions={stackOptions}>
      <HistoryStack.Screen name="SeasonList" component={SeasonListScreen} options={{ title: t('nav.seasonList') }} />
      <HistoryStack.Screen
        name="SeasonDetail"
        component={SeasonDetailScreen}
        options={{ title: t('nav.seasonDetail') }}
      />
      <HistoryStack.Screen name="EventResult" component={EventResultScreen} options={{ title: t('nav.eventResult') }} />
    </HistoryStack.Navigator>
  );
}

function RulesNav() {
  const { t } = useTranslation();
  return (
    <RulesStack.Navigator screenOptions={stackOptions}>
      <RulesStack.Screen name="Rules" component={RulesScreen} options={{ title: t('nav.rules') }} />
      <RulesStack.Screen name="Account" component={AccountScreen} options={{ title: t('nav.account') }} />
    </RulesStack.Navigator>
  );
}

const icon = (glyph) => {
  const TabIcon = () => <Text style={{ fontSize: 18 }}>{glyph}</Text>;
  return TabIcon;
};

// Own component so tab titles re-render when the language changes.
function AppTabs() {
  const { t } = useTranslation();
  const tab = (key, glyph) => {
    const title = t(`tabs.${key}`);
    return { title, tabBarIcon: icon(glyph), tabBarAccessibilityLabel: t('tabs.a11y', { title }) };
  };
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary }}>
      <Tab.Screen name="PlayTab" component={PlayNav} options={tab('play', '🎮')} />
      <Tab.Screen name="CollectionTab" component={CollectionNav} options={tab('collection', '🃏')} />
      <Tab.Screen name="StandingsTab" component={StandingsNav} options={tab('standings', '🏆')} />
      <Tab.Screen name="HistoryTab" component={HistoryNav} options={tab('history', '📜')} />
      <Tab.Screen name="RulesTab" component={RulesNav} options={tab('rules', '📖')} />
    </Tab.Navigator>
  );
}

/** @param {{ api?: import('./src/data/api/demoApi').GameApi }} props injected in tests; defaults to createApi() */
export default function App({ api }) {
  return (
    <SafeAreaProvider>
      <LanguageGate>
        <GameProvider api={api}>
          <NavigationContainer linking={linking}>
            <StatusBar style="dark" />
            <AppTabs />
          </NavigationContainer>
        </GameProvider>
      </LanguageGate>
    </SafeAreaProvider>
  );
}
