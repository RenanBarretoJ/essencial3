import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';

const TODAY_KEY = () => `dayplan_${format(new Date(), 'yyyy-MM-dd')}`;
const REMINDERS_KEY = 'reminder_settings';

export const defaultDayPlan = {
  priorities: ['', '', ''],
  done: [false, false, false],
};

export const defaultReminderSettings = {
  enabled: true,
  times: ['09:00', '13:00', '18:00'],
};

export async function loadTodayPlan() {
  try {
    const raw = await AsyncStorage.getItem(TODAY_KEY());
    return raw ? JSON.parse(raw) : defaultDayPlan;
  } catch {
    return defaultDayPlan;
  }
}

export async function saveTodayPlan(plan) {
  await AsyncStorage.setItem(TODAY_KEY(), JSON.stringify(plan));
}

export async function loadReminderSettings() {
  try {
    const raw = await AsyncStorage.getItem(REMINDERS_KEY);
    return raw ? JSON.parse(raw) : defaultReminderSettings;
  } catch {
    return defaultReminderSettings;
  }
}

export async function saveReminderSettings(settings) {
  await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(settings));
}
