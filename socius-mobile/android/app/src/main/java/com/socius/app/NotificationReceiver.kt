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

            if (reactContext != null) {
                val params = Arguments.createMap()
                params.putString("requestId", intent.getStringExtra("call_uuid"))
                params.putString("action", "decline")
                
                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("CallDeclined", params)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
