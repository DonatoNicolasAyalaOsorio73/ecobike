// Web has no scheduled notifications; avoids loading expo-notifications there.
export async function setWeeklyReminder(_on: boolean): Promise<boolean> {
  return false;
}
