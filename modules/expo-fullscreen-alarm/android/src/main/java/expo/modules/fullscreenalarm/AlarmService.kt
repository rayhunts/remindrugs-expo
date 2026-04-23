package expo.modules.fullscreenalarm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

class AlarmService : Service() {
  private val TAG = "ExpoFullscreenAlarm"

  companion object {
    private const val FULLSCREEN_NOTIFICATION_ID = 10001
    private const val FOREGROUND_SERVICE_NOTIFICATION_ID = 10002
    private const val FOREGROUND_SERVICE_CHANNEL_ID = "expo_fullscreen_alarm_service"
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    Log.d(TAG, "AlarmService started")

    if (intent == null) {
      stopSelf()
      return START_NOT_STICKY
    }

    val alarmId = intent.getStringExtra("alarmId") ?: ""
    val title = intent.getStringExtra("title") ?: "Alarm"
    val body = intent.getStringExtra("body") ?: ""
    val channelId = intent.getStringExtra("channelId") ?: "remindrugs-channel"
    val reminderId = intent.getStringExtra("reminderId") ?: alarmId

    // Store reminderId in SharedPreferences for JS to consume later
    val prefs = getSharedPreferences("expo_fullscreen_alarm", Context.MODE_PRIVATE)
    prefs.edit().putString("launch_reminder_id", reminderId).apply()

    // Create foreground service channel (required for Android 8+)
    createForegroundServiceChannel()

    // Start as foreground service with a minimal notification
    val foregroundNotification = NotificationCompat.Builder(this, FOREGROUND_SERVICE_CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
      .setContentTitle("Alarm")
      .setContentText("Preparing alarm...")
      .setPriority(NotificationCompat.PRIORITY_MIN)
      .build()

    startForeground(FOREGROUND_SERVICE_NOTIFICATION_ID, foregroundNotification)

    // Post the fullscreen notification
    postFullscreenNotification(alarmId, title, body, channelId, reminderId)

    // Stop the foreground service - notification will persist
    stopSelf()

    Log.d(TAG, "AlarmService finished posting notification for alarmId=$alarmId")
    return START_NOT_STICKY
  }

  private fun createForegroundServiceChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        FOREGROUND_SERVICE_CHANNEL_ID,
        "Alarm Service",
        NotificationManager.IMPORTANCE_MIN
      ).apply {
        description = "Used to deliver fullscreen alarm notifications"
        setShowBadge(false)
      }
      val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      manager.createNotificationChannel(channel)
    }
  }

  private fun postFullscreenNotification(
    alarmId: String,
    title: String,
    body: String,
    channelId: String,
    reminderId: String
  ) {
    // Create the fullscreen intent that launches the app's alarm screen
    val fullscreenIntent = Intent(this, Class.forName(
      "com.rayhunts.remindrugs.MainActivity"
    )).apply {
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or
        Intent.FLAG_ACTIVITY_CLEAR_TOP or
        Intent.FLAG_ACTIVITY_SINGLE_TOP
      putExtra("reminderId", reminderId)
      putExtra("alarmId", alarmId)
      putExtra("fromFullscreenAlarm", true)
    }

    val fullscreenPendingIntent = PendingIntent.getActivity(
      this,
      alarmId.hashCode() and 0x7FFFFFFF,
      fullscreenIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    // Determine if fullscreen intent is allowed (Android 14+)
    val canUseFullScreenIntent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      notificationManager.canUseFullScreenIntent()
    } else {
      true
    }

    // Alarm sound URI
    val alarmSound: Uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
      ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

    // Vibration pattern
    val vibrationPattern = longArrayOf(0, 500, 500, 500, 500, 500)

    // Build the notification
    val notificationBuilder = NotificationCompat.Builder(this, channelId)
      .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
      .setContentTitle(title)
      .setContentText(body)
      .setAutoCancel(true)
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setSound(alarmSound)
      .setVibrate(vibrationPattern)
      .setDefaults(0)

    if (canUseFullScreenIntent) {
      notificationBuilder.setFullScreenIntent(fullscreenPendingIntent, true)
      Log.d(TAG, "Using fullscreen intent")
    } else {
      // Fallback: set high-priority content intent to show heads-up
      notificationBuilder.setContentIntent(fullscreenPendingIntent)
      Log.d(TAG, "Fullscreen intent not permitted, falling back to content intent")
    }

    val notification = notificationBuilder.build()

    // Add flags to ensure the notification shows over lock screen
    notification.flags = notification.flags or
      Notification.FLAG_INSISTENT or
      Notification.FLAG_SHOW_LIGHTS

    // Post the notification
    try {
      NotificationManagerCompat.from(this).notify(
        FULLSCREEN_NOTIFICATION_ID,
        notification
      )
      Log.d(TAG, "Fullscreen alarm notification posted for alarmId=$alarmId")
    } catch (e: SecurityException) {
      Log.e(TAG, "SecurityException posting notification. Missing permission?", e)
      // Attempt without fullscreen intent
      val fallbackBuilder = NotificationCompat.Builder(this, channelId)
        .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
        .setContentTitle(title)
        .setContentText(body)
        .setAutoCancel(true)
        .setPriority(NotificationCompat.PRIORITY_HIGH)
        .setCategory(NotificationCompat.CATEGORY_ALARM)
        .setContentIntent(fullscreenPendingIntent)
        .setSound(alarmSound)
        .setVibrate(vibrationPattern)

      try {
        NotificationManagerCompat.from(this).notify(
          FULLSCREEN_NOTIFICATION_ID,
          fallbackBuilder.build()
        )
        Log.d(TAG, "Fallback notification posted for alarmId=$alarmId")
      } catch (e2: Exception) {
        Log.e(TAG, "Failed to post fallback notification", e2)
      }
    }
  }
}
