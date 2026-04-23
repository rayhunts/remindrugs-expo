package expo.modules.fullscreenalarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONObject

class ExpoFullscreenAlarmModule : Module() {
  private val TAG = "ExpoFullscreenAlarm"

  private val prefs by lazy {
    appContext.reactContext?.getSharedPreferences("expo_fullscreen_alarm", Context.MODE_PRIVATE)
      ?: throw IllegalStateException("React context is not available")
  }

  override fun definition() = ModuleDefinition {
    Name("ExpoFullscreenAlarm")

    AsyncFunction("scheduleAlarm") { params: Map<String, Any> ->
      val id = params["id"] as? String ?: throw IllegalArgumentException("Missing alarm id")
      val title = params["title"] as? String ?: ""
      val body = params["body"] as? String ?: ""
      val triggerAtMs = (params["triggerAtMs"] as? Number)?.toLong()
        ?: throw IllegalArgumentException("Missing triggerAtMs")
      val channelId = params["channelId"] as? String ?: "remindrugs-channel"

      Log.d(TAG, "Scheduling alarm id=$id at $triggerAtMs")

      // Store alarm metadata in SharedPreferences
      val alarmJson = JSONObject().apply {
        put("id", id)
        put("title", title)
        put("body", body)
        put("channelId", channelId)
        put("triggerAtMs", triggerAtMs)
        put("reminderId", id.substringBefore("_"))
      }
      prefs.edit()
        .putString("alarm_$id", alarmJson.toString())
        .apply()

      // Store the set of alarm IDs for later enumeration
      val ids = prefs.getStringSet("alarm_ids", emptySet())?.toMutableSet() ?: mutableSetOf()
      ids.add(id)
      prefs.edit().putStringSet("alarm_ids", ids).apply()

      // Create the PendingIntent for the AlarmReceiver
      val context = appContext.reactContext ?: throw IllegalStateException("React context is not available")
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

      val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      alarmManager.setExactAndAllowWhileIdle(
        AlarmManager.RTC_WAKEUP,
        triggerAtMs,
        pendingIntent
      )

      Log.d(TAG, "Alarm scheduled: id=$id, triggerAt=$triggerAtMs")
    }

    AsyncFunction("cancelAlarm") { id: String ->
      Log.d(TAG, "Cancelling alarm id=$id")

      val context = appContext.reactContext ?: return@AsyncFunction
      val alarmIntent = Intent(context, AlarmReceiver::class.java).apply {
        action = "expo.modules.fullscreenalarm.ALARM"
        putExtra("alarmId", id)
      }

      val requestCode = id.hashCode() and 0x7FFFFFFF
      val pendingIntent = PendingIntent.getBroadcast(
        context,
        requestCode,
        alarmIntent,
        PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
      )

      pendingIntent?.let {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        alarmManager.cancel(it)
        it.cancel()
      }

      // Remove stored alarm data
      prefs.edit()
        .remove("alarm_$id")
        .apply()

      val ids = prefs.getStringSet("alarm_ids", emptySet())?.toMutableSet() ?: mutableSetOf()
      ids.remove(id)
      prefs.edit().putStringSet("alarm_ids", ids).apply()

      Log.d(TAG, "Alarm cancelled: id=$id")
    }

    AsyncFunction("cancelAllAlarms") {
      Log.d(TAG, "Cancelling all alarms")

      val context = appContext.reactContext ?: return@AsyncFunction
      val ids = prefs.getStringSet("alarm_ids", emptySet()) ?: emptySet()

      for (id in ids) {
        val alarmIntent = Intent(context, AlarmReceiver::class.java).apply {
          action = "expo.modules.fullscreenalarm.ALARM"
          putExtra("alarmId", id)
        }

        val requestCode = id.hashCode() and 0x7FFFFFFF
        val pendingIntent = PendingIntent.getBroadcast(
          context,
          requestCode,
          alarmIntent,
          PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
        )

        pendingIntent?.let {
          val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
          alarmManager.cancel(it)
          it.cancel()
        }

        prefs.edit().remove("alarm_$id").apply()
      }

      prefs.edit()
        .remove("alarm_ids")
        .apply()

      Log.d(TAG, "All alarms cancelled (${ids.size} alarms)")
    }

    AsyncFunction("consumeLaunchReminderId") {
      val reminderId = prefs.getString("launch_reminder_id", null)
      if (reminderId != null) {
        prefs.edit().remove("launch_reminder_id").apply()
        Log.d(TAG, "Consumed launch reminderId=$reminderId")
      } else {
        Log.d(TAG, "No launch reminderId to consume")
      }
      reminderId
    }
  }
}
