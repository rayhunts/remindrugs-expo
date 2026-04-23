const {
  withSettingsGradle,
  withAppBuildGradle,
  withAndroidManifest,
  AndroidConfig,
} = require("@expo/config-plugins");

const MODULE_NAME = "expo-fullscreen-alarm";
const MODULE_PATH = "../modules/expo-fullscreen-alarm/android";
const PACKAGE_NAME = "expo.modules.fullscreenalarm";

const PERMISSIONS = [
  "android.permission.SCHEDULE_EXACT_ALARM",
  "android.permission.USE_EXACT_ALARM",
  "android.permission.RECEIVE_BOOT_COMPLETED",
  "android.permission.USE_FULL_SCREEN_INTENT",
  "android.permission.WAKE_LOCK",
  "android.permission.VIBRATE",
  "android.permission.FOREGROUND_SERVICE",
  "android.permission.FOREGROUND_SERVICE_SPECIAL_USE",
];

function addPermissions(manifest) {
  const items = AndroidConfig.Manifest.getPermissions(manifest.modResults);
  for (const perm of PERMISSIONS) {
    const existing = items.find(
      (item) => item["android:name"] === perm
    );
    if (!existing) {
      items.push({ "android:name": perm });
    }
  }
  manifest.modResults = AndroidConfig.Manifest.setPermissions(
    manifest.modResults,
    items
  );
  return manifest;
}

function addReceivers(manifest) {
  const application = AndroidConfig.Manifest.getApplication(manifest.modResults);

  // AlarmReceiver
  const alarmReceiver = {
    $: {
      "android:name": `${PACKAGE_NAME}.AlarmReceiver`,
      "android:exported": "false",
    },
  };

  // BootReceiver
  const bootReceiver = {
    $: {
      "android:name": `${PACKAGE_NAME}.BootReceiver`,
      "android:exported": "false",
    },
    "intent-filter": [
      {
        action: [{ $: { "android:name": "android.intent.action.BOOT_COMPLETED" } }],
      },
      {
        action: [{ $: { "android:name": "android.intent.action.MY_PACKAGE_REPLACED" } }],
      },
    ],
  };

  // AlarmService
  const alarmService = {
    $: {
      "android:name": `${PACKAGE_NAME}.AlarmService`,
      "android:foregroundServiceType": "specialUse",
      "android:exported": "false",
    },
  };

  // Only add if not already present
  const existingItems = application["receiver"] || [];
  const existingServices = application["service"] || [];

  const hasAlarmReceiver = existingItems.some(
    (r) => r.$ && r.$["android:name"] === `${PACKAGE_NAME}.AlarmReceiver`
  );
  if (!hasAlarmReceiver) {
    application["receiver"] = [...existingItems, alarmReceiver, bootReceiver];
  }

  const hasAlarmService = existingServices.some(
    (s) => s.$ && s.$["android:name"] === `${PACKAGE_NAME}.AlarmService`
  );
  if (!hasAlarmService) {
    application["service"] = [...existingServices, alarmService];
  }

  return manifest;
}

function withFullscreenAlarm(config) {
  // 1. Include module in settings.gradle
  config = withSettingsGradle(config, (config) => {
    const contents = config.modResults.contents;
    if (!contents.includes(`':${MODULE_NAME}'`)) {
      config.modResults.contents += `\ninclude ':${MODULE_NAME}'\nproject(':${MODULE_NAME}').projectDir = new File(rootProject.projectDir, '${MODULE_PATH}')\n`;
    }
    return config;
  });

  // 2. Add module as dependency in app/build.gradle
  config = withAppBuildGradle(config, (config) => {
    const contents = config.modResults.contents;
    if (!contents.includes(`project(':${MODULE_NAME}')`)) {
      config.modResults.contents = contents.replace(
        /dependencies\s*\{/,
        `dependencies {\n        implementation project(':${MODULE_NAME}')\n`
      );
    }
    return config;
  });

  // 3. Merge AndroidManifest (permissions, receivers, services)
  config = withAndroidManifest(config, (config) => {
    config = addPermissions(config);
    config = addReceivers(config);
    return config;
  });

  return config;
}

module.exports = withFullscreenAlarm;
