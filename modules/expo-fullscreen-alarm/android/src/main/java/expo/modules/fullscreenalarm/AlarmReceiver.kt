package expo.modules.fullscreenalarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import org.json.JSONObject

class AlarmReceiver : BroadcastReceiver() {
  private val TAG = "ExpoFullscreenAlarm"

  override fun onReceive(context: Context, intent: Intent) {
    Log.d(TAG, "AlarmReceiver triggered: action=${intent.action}")

    if (intent.action != "expo.modules.fullscreenalarm.ALARM") {
      Log.w(TAG, "Unexpected action: ${intent.action}")
      return
    }

    val alarmId = intent.getStringExtra("alarmId")
    if (alarmId == null) {
      Log.e(TAG, "No alarmId in intent extras")
      return
    }

    // Read alarm metadata from SharedPreferences
    val prefs = context.getSharedPreferences("expo_fullscreen_alarm", Context.MODE_PRIVATE)
    val alarmJsonStr = prefs.getString("alarm_$alarmId", null)
    if (alarmJsonStr == null) {
      Log.e(TAG, "No stored alarm data for id=$alarmId")
      return
    }

    val alarmJson: JSONObject
    try {
      alarmJson = JSONObject(alarmJsonStr)
    } catch (e: Exception) {
      Log.e(TAG, "Failed to parse alarm JSON for id=$alarmId", e)
      return
    }

    val title = alarmJson.optString("title", "Alarm")
    val body = alarmJson.optString("body", "")
    val channelId = alarmJson.optString("channelId", "remindrugs-channel")
    val reminderId = alarmJson.optString("reminderId", alarmId)

    // Start AlarmService as a foreground service
    val serviceIntent = Intent(context, AlarmService::class.java).apply {
      putExtra("alarmId", alarmId)
      putExtra("title", title)
      putExtra("body", body)
      putExtra("channelId", channelId)
      putExtra("reminderId", reminderId)
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      context.startForegroundService(serviceIntent)
    } else {
      context.startService(serviceIntent)
    }

    Log.d(TAG, "AlarmService started for alarmId=$alarmId")
  }
}
