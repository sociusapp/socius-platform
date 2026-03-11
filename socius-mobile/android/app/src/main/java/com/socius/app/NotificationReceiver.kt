package com.socius.app

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule

class NotificationReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val notificationId = intent.getIntExtra("notification_id", -1)
        if (notificationId != -1) {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.cancel(notificationId)
        }
        
        try {
            val reactApplication = context.applicationContext as ReactApplication
            val reactNativeHost = reactApplication.reactNativeHost
            val reactContext = reactNativeHost.reactInstanceManager.currentReactContext

            val requestId = intent.getStringExtra("call_uuid")

            if (reactContext != null && reactContext.hasActiveCatalystInstance()) {
                val params = Arguments.createMap()
                params.putString("requestId", requestId)
                params.putString("action", "decline")
                
                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("CallDeclined", params)
            } else if (!requestId.isNullOrEmpty()) {
                val launchIntent = Intent(context, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_CLEAR_TOP or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP or
                        Intent.FLAG_ACTIVITY_NO_ANIMATION or
                        Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS
                    putExtra("call_uuid", requestId)
                    putExtra("action", "decline")
                }
                context.startActivity(launchIntent)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
