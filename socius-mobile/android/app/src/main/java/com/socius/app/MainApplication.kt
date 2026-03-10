package com.socius.app

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.ContentResolver
import android.content.res.Configuration
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.common.ReleaseLevel
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactNativeHost

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ReactNativeHostWrapper

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost = ReactNativeHostWrapper(
      this,
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
              PackageList(this).packages.apply {
                // Packages that cannot be autolinked yet can be added manually here, for example:
                add(SociusCallPackage())
              }

          override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"

          override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

          override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
      }
  )

  override val reactHost: ReactHost
    get() = ReactNativeHostWrapper.createReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    createNotificationChannels()
    DefaultNewArchitectureEntryPoint.releaseLevel = try {
      ReleaseLevel.valueOf(BuildConfig.REACT_NATIVE_RELEASE_LEVEL.uppercase())
    } catch (e: IllegalArgumentException) {
      ReleaseLevel.STABLE
    }
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
    loadReactNative(this)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }

  private fun createNotificationChannels() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val manager = getSystemService(NotificationManager::class.java) ?: return

      val attributes = AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_NOTIFICATION)
        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
        .build()

      val generalSoundUri = Uri.parse("${ContentResolver.SCHEME_ANDROID_RESOURCE}://${packageName}/raw/general_notification")
      val helpRequestSoundUri = Uri.parse("${ContentResolver.SCHEME_ANDROID_RESOURCE}://${packageName}/raw/help_request")
      val presenceAlarmSoundUri = Uri.parse("${ContentResolver.SCHEME_ANDROID_RESOURCE}://${packageName}/raw/presence_alarm")

      val presenceAlarmChannel = NotificationChannel(
        "socius_presence_alarm",
        "Presence Alerts",
        NotificationManager.IMPORTANCE_HIGH
      ).apply {
        setSound(presenceAlarmSoundUri, attributes)
        enableVibration(true)
        description = "Urgent presence and safety alerts"
      }

      val helpAlarmChannel = NotificationChannel(
        "socius_help_alarm",
        "Help Request Alerts",
        NotificationManager.IMPORTANCE_HIGH
      ).apply {
        setSound(helpRequestSoundUri, attributes)
        enableVibration(true)
        description = "Daily help and assistance requests"
      }

      val statusUpdateChannel = NotificationChannel(
        "socius_status_update",
        "Status Updates",
        NotificationManager.IMPORTANCE_DEFAULT
      ).apply {
        setSound(generalSoundUri, attributes)
        enableVibration(true)
        description = "Match found, volunteer ETA and awareness updates"
      }

      val nudgeChannel = NotificationChannel(
        "socius_nudge",
        "Community Nudges",
        NotificationManager.IMPORTANCE_LOW
      ).apply {
        enableVibration(false)
        description = "Balance reminders and gentle nudges from the community"
      }

      val silentChannel = NotificationChannel(
        "socius_silent",
        "Activity Summary",
        NotificationManager.IMPORTANCE_MIN
      ).apply {
        enableVibration(false)
        description = "Closed requests, badges and summaries"
      }

      manager.createNotificationChannel(presenceAlarmChannel)
      manager.createNotificationChannel(helpAlarmChannel)
      manager.createNotificationChannel(statusUpdateChannel)
      manager.createNotificationChannel(nudgeChannel)
      manager.createNotificationChannel(silentChannel)
    }
  }
}
