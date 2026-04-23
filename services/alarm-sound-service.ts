import { createAudioPlayer, setAudioModeAsync } from "expo-audio";

let player: ReturnType<typeof createAudioPlayer> | null = null;

export async function startAlarmSound(): Promise<void> {
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
    });
    player = createAudioPlayer(require("@/assets/sounds/pill_bottle_shake.mp3"));
    player.loop = true;
    player.play();
  } catch (error) {
    console.error("Failed to start alarm sound:", error);
  }
}

export async function stopAlarmSound(): Promise<void> {
  try {
    if (player) {
      player.pause();
      player.replace(null);
      player = null;
    }
  } catch (error) {
    console.error("Failed to stop alarm sound:", error);
  }
}
