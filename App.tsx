import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { setupForegroundNotifications, setupBackgroundNotificationHandler, createNotificationChannel } from './src/lib/notifications';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import AnnouncementsScreen from './src/screens/AnnouncementsScreen';
import NewAnnouncementScreen from './src/screens/NewAnnouncementScreen';
import EditAnnouncementScreen from './src/screens/EditAnnouncementScreen';
import CellGroupsScreen from './src/screens/CellGroupsScreen';
import NewCellGroupScreen from './src/screens/NewCellGroupScreen';
import EditCellGroupScreen from './src/screens/EditCellGroupScreen';
import EventsScreen from './src/screens/EventsScreen';
import NewEventScreen from './src/screens/NewEventScreen';
import EditEventScreen from './src/screens/EditEventScreen';
import VolunteerScreen from './src/screens/VolunteerScreen';
import NewVolunteerScreen from './src/screens/NewVolunteerScreen';
import EditVolunteerScreen from './src/screens/EditVolunteerScreen';
import LoveActionScreen from './src/screens/LoveActionScreen';
import PrayerRequestsScreen from './src/screens/PrayerRequestsScreen';
import AdminScreen from './src/screens/AdminScreen';
import SettingsScreen from './src/screens/SettingsScreen';

export type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  ForgotPassword: undefined;
  ResetPassword: undefined;
  Settings: undefined;
  Announcements: undefined;
  NewAnnouncement: undefined;
  EditAnnouncement: { id: string };
  CellGroups: undefined;
  NewCellGroup: undefined;
  EditCellGroup: { id: string };
  Events: undefined;
  NewEvent: undefined;
  EditEvent: { id: string };
  Volunteer: undefined;
  NewVolunteer: undefined;
  EditVolunteer: { id: string };
  LoveAction: undefined;
  PrayerRequests: undefined;
  Admin: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  useEffect(() => {
    createNotificationChannel()
    setupBackgroundNotificationHandler()
    const unsubscribe = setupForegroundNotifications()
    return () => { unsubscribe?.() }
  }, [])

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          <Stack.Screen name="Announcements" component={AnnouncementsScreen} />
          <Stack.Screen name="NewAnnouncement" component={NewAnnouncementScreen} />
          <Stack.Screen name="EditAnnouncement" component={EditAnnouncementScreen} />
          <Stack.Screen name="CellGroups" component={CellGroupsScreen} />
          <Stack.Screen name="NewCellGroup" component={NewCellGroupScreen} />
          <Stack.Screen name="EditCellGroup" component={EditCellGroupScreen} />
          <Stack.Screen name="Events" component={EventsScreen} />
          <Stack.Screen name="NewEvent" component={NewEventScreen} />
          <Stack.Screen name="EditEvent" component={EditEventScreen} />
          <Stack.Screen name="Volunteer" component={VolunteerScreen} />
          <Stack.Screen name="NewVolunteer" component={NewVolunteerScreen} />
          <Stack.Screen name="EditVolunteer" component={EditVolunteerScreen} />
          <Stack.Screen name="LoveAction" component={LoveActionScreen} />
          <Stack.Screen name="PrayerRequests" component={PrayerRequestsScreen} />
          <Stack.Screen name="Admin" component={AdminScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
