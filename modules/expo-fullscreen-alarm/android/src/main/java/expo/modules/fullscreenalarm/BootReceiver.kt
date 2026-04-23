package expo.modules.fullscreenalarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import org.json.JSONObject

class BootReceiver : BroadcastReceiver() {
  private val TAG = "ExpoFullscreenAlarm"

  override fun onReceive(context: Context, intent: Intent) {
    Log.d(TAG, "BootReceiver triggered: action=${intent.action}")

    if (intent.action != Intent.ACTION_BOOT_COMPLETED &&
      intent.action != Intent.ACTION_MY_PACKAGE_REPLACED
    ) {
      Log.w(TAG, "Unexpected action: ${intent.action}")
      return
    }

    val prefs = context.getSharedPreferences("expo_fullscreen_alarm", Context.MODE_PRIVATE)
    val alarmIds = prefs.getStringSet("alarm_ids", emptySet()) ?: emptySet()

    if (alarmIds.isEmpty()) {
      Log.d(TAG, "No alarms to reschedule")
      return
    }

    val now = System.currentTimeMillis()
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    var rescheduled = 0

    for (id in alarmIds) {
      val alarmJsonStr = prefs.getString("alarm_$id", null)
      if (alarmJsonStr == null) {
        Log.w(TAG, "No stored data for alarm id=$id, skipping")
        continue
      }

      val alarmJson: JSONObject
      try {
        alarmJson = JSONObject(alarmJsonStr)
      } catch (e: Exception) {
        Log.e(TAG, "Failed to parse alarm JSON for id=$id", e)
        continue
      }

      val triggerAtMs = alarmJson.optLong("triggerAtMs", 0)
      if (triggerAtMs <= now) {
        Log.d(TAG, "Alarm id=$id is in the past ($triggerAtMs), skipping")
        continue
      }

      // Re-schedule the alarm
      val alarmIntent = Intent(context, AlarmReceiver::class.java).apply {
        action = "expo.modules.fullscreenalarm.ALARM"
        putExtra("alarmId", id)
      }

      val requestCode = id.hashCode() and 0x7FFFFFFF
      val pendingIntent = PendingIntent.getBroadcast(
        context,
        requestCode,
        alarmIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )

      alarmManager.setExactAndAllowWhileIdle(
        AlarmManager.RTC_WAKEUP,
        triggerAtMs,
        pendingIntent
      )

      rescheduled++
      Log.d(TAG, "Rescheduled alarm id=$id at $triggerAtMs")
    }

    Log.d(TAG, "Boot rescheduling complete: $rescheduled/${alarmIds.size} alarms rescheduled")
  }
}
