import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestPermissions() {
  if (!Device.isDevice) {
    return false;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Lembretes do dia',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }

  return finalStatus === 'granted';
}

export async function cancelAllReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function scheduleReminders(priorities, times) {
  await cancelAllReminders();

  const activePriorities = priorities.filter((p) => p.trim().length > 0);
  if (activePriorities.length === 0) return;

  const now = new Date();

  for (const timeStr of times) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const trigger = new Date();
    trigger.setHours(hours, minutes, 0, 0);

    if (trigger <= now) continue;

    const label =
      activePriorities.length === 1
        ? activePriorities[0]
        : activePriorities.join(' · ');

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🎯 Foco do dia',
        body: label,
        sound: 'default',
      },
      trigger: {
        type: 'date',
        date: trigger,
      },
    });
  }
}
