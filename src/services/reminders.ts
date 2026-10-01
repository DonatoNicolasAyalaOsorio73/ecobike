import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

const WEEKLY_ID = "ecobike-weekly-goal";

/** Sunday 18:00 local reminder to check the weekly goal (native only; web has no scheduled notifications). */
export async function setWeeklyReminder(on: boolean): Promise<boolean> {
  if (Platform.OS === "web") return false;
  await Notifications.cancelScheduledNotificationAsync(WEEKLY_ID).catch(() => {});
  if (!on) return true;
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== "granted") return false;
  await Notifications.scheduleNotificationAsync({
    identifier: WEEKLY_ID,
    content: { title: "Tu meta semanal", body: "¿Cómo vas con tus kilómetros esta semana? Abre EcoBike y revísalo." },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 1, hour: 18, minute: 0 },
  });
  return true;
}
