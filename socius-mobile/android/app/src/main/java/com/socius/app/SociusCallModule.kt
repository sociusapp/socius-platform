package com.socius.app

import android.app.Activity
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import android.graphics.Rect
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Typeface
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.Person
import androidx.core.graphics.drawable.IconCompat
import com.socius.app.R
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class SociusCallModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), ActivityEventListener {

    init { reactContext.addActivityEventListener(this) }

    override fun getName(): String = "SociusCallModule"

    private var helpRequestPlayer: MediaPlayer? = null
    private var helpRequestFocusRequest: AudioFocusRequest? = null

    // ─────────────────────────────────────────────────────────────
    //  Config per notification type
    // ─────────────────────────────────────────────────────────────
    private data class NotifConfig(
        val channelId:     String,
        val channelName:   String,
        val soundName:     String,
        val category:      String,
        val accentColor:   Int,
        val darkColor:     Int,       // darker shade of accent for gradient
        val lightColor:    Int,       // LED color
        val typeLabel:     String,    // e.g. "PRESENCE ALARM · URGENT"
        val titleTemplate: String,    // {name} replaced at runtime
        val bodyTemplate:  String,    // {info} replaced at runtime
        val guidanceLine:  String,    // small helper text
        val declineLabel:  String,
        val acceptLabel:   String,
        val acceptBtnBg:   String     // drawable name for accept button
    )

    private fun resolveConfig(payload: String?): NotifConfig {
        val type = runCatching {
            val json = JSONObject(payload ?: "{}")
            json.optString("type", "")
        }.getOrDefault("")

        return when (type) {
            "PRESENCE_ALARM" -> NotifConfig(
                channelId     = "socius_presence_alarm",
                channelName   = "Presence Alarms",
                soundName     = "presence_alarm",
                category      = NotificationCompat.CATEGORY_ALARM,
                accentColor   = Color.parseColor("#D95F5F"),
                darkColor     = Color.parseColor("#8B1A1A"),
                lightColor    = Color.RED,
                typeLabel     = "Socius . Needs Presence",
                titleTemplate = "Socius . Needs Presence",
                bodyTemplate  = "{info}",
                guidanceLine  = "Stay visible",
                declineLabel  = "Can't Go",
                acceptLabel   = "I'm Aware",
                acceptBtnBg   = "bg_btn_alarm"
            )
            "MATCH_FOUND" -> NotifConfig(
                channelId     = "socius_updates",
                channelName   = "Match Found",
                soundName     = "match_found",
                category      = NotificationCompat.CATEGORY_STATUS,
                accentColor   = Color.parseColor("#3DAA6B"),
                darkColor     = Color.parseColor("#0D5A2E"),
                lightColor    = Color.GREEN,
                typeLabel     = "Socius . Match Found",
                titleTemplate = "Match Found: {name}",
                bodyTemplate  = "{info}",
                guidanceLine  = "Help is coming",
                declineLabel  = "Cancel Request",
                acceptLabel   = "Open Map",
                acceptBtnBg   = "bg_btn_match"
            )
            else -> NotifConfig(       // HELP_REQUEST (default)
                channelId     = "socius_help_alarm",
                channelName   = "Help Requests",
                soundName     = "help_request",
                category      = NotificationCompat.CATEGORY_CALL,
                accentColor   = Color.parseColor("#4A7EB5"),
                darkColor     = Color.parseColor("#0D2E5A"),
                lightColor    = Color.BLUE,
                typeLabel     = "Socius . Help Request",
                titleTemplate = "Socius . Help Request",
                bodyTemplate  = "{info}",
                guidanceLine  = "No task required",
                declineLabel  = "Not available",
                acceptLabel   = "View",
                acceptBtnBg   = "bg_btn_help"
            )
        }
    }

    // ─────────────────────────────────────────────────────────────
    //  Canvas helpers
    // ─────────────────────────────────────────────────────────────

    /** Crop any bitmap to a rounded square */
    private fun toRoundedSquare(src: Bitmap, size: Int, radius: Float): Bitmap {
        val out    = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(out)
        val paint  = Paint(Paint.ANTI_ALIAS_FLAG)
        val rect   = RectF(0f, 0f, size.toFloat(), size.toFloat())
        
        canvas.drawRoundRect(rect, radius, radius, paint)
        paint.xfermode = PorterDuffXfermode(PorterDuff.Mode.SRC_IN)
        canvas.drawBitmap(Bitmap.createScaledBitmap(src, size, size, true), 0f, 0f, paint)
        return out
    }

    /** Crop any bitmap to a circle */
    private fun toCircle(src: Bitmap, size: Int): Bitmap {
        val out    = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(out)
        val paint  = Paint(Paint.ANTI_ALIAS_FLAG)
        canvas.drawOval(RectF(0f, 0f, size.toFloat(), size.toFloat()), paint)
        paint.xfermode = PorterDuffXfermode(PorterDuff.Mode.SRC_IN)
        canvas.drawBitmap(Bitmap.createScaledBitmap(src, size, size, true), 0f, 0f, paint)
        return out
    }

    /** Initials avatar when no photo available */
    private fun initialsAvatar(name: String, accent: Int, size: Int): Bitmap {
        val bmp    = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)

        // Gradient rounded square background
        val gradient = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            shader = LinearGradient(
                0f, 0f, size.toFloat(), size.toFloat(),
                accent, darken(accent, 0.55f),
                Shader.TileMode.CLAMP
            )
        }
        val radius = 25f // Slight radius for rounded square
        canvas.drawRoundRect(RectF(0f, 0f, size.toFloat(), size.toFloat()), radius, radius, gradient)

        // Initials text
        val initials = name.trim().split(" ")
            .take(2).mapNotNull { it.firstOrNull()?.uppercaseChar() }.joinToString("")
            .ifEmpty { "?" }

        val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color     = Color.WHITE
            textSize  = size * 0.38f
            typeface  = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            textAlign = Paint.Align.CENTER
        }
        val bounds = Rect()
        textPaint.getTextBounds(initials, 0, initials.length, bounds)
        canvas.drawText(initials, size / 2f, size / 2f - bounds.exactCenterY(), textPaint)

        return bmp
    }

    private fun darken(color: Int, factor: Float): Int {
        val r = (Color.red(color)   * factor).toInt().coerceIn(0, 255)
        val g = (Color.green(color) * factor).toInt().coerceIn(0, 255)
        val b = (Color.blue(color)  * factor).toInt().coerceIn(0, 255)
        return Color.rgb(r, g, b)
    }

    private fun withAlpha(color: Int, alpha: Int): Int =
        Color.argb(alpha, Color.red(color), Color.green(color), Color.blue(color))

    private fun dpToPx(dp: Float): Float =
        dp * reactContext.resources.displayMetrics.density

    private fun buildCardBitmap(
        cfg:    NotifConfig,
        title:  String,
        body:   String,
        avatar: Bitmap
    ): Bitmap {
        val W = dpToPx(480f).toInt()
        val H = dpToPx(186f).toInt()

        val bmp    = Bitmap.createBitmap(W, H, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)

        val bgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#1C1C2E")
        }
        val bgRect  = RectF(0f, 0f, W.toFloat(), H.toFloat())
        val radius  = dpToPx(16f)
        canvas.drawRoundRect(bgRect, radius, radius, bgPaint)

        val stripW  = dpToPx(4f)
        val stripH  = H.toFloat() - dpToPx(24f)
        val stripTop = dpToPx(12f)
        val stripPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = cfg.accentColor }
        canvas.drawRoundRect(
            RectF(dpToPx(10f), stripTop, dpToPx(10f) + stripW, stripTop + stripH),
            stripW / 2, stripW / 2, stripPaint
        )

        val avatarSize  = dpToPx(48f).toInt()
        val avatarLeft  = dpToPx(22f)
        val avatarTop   = dpToPx(20f)
        val circleAvatar = toCircle(avatar, avatarSize)
        canvas.drawBitmap(circleAvatar, avatarLeft, avatarTop, null)

        val contentLeft = avatarLeft + avatarSize + dpToPx(12f)
        val contentTop  = dpToPx(16f)
        var cursorY     = contentTop

        val labelText   = cfg.typeLabel
        val labelPaint  = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color    = cfg.accentColor
            textSize = dpToPx(9.5f)
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
        }
        val labelBounds = Rect()
        labelPaint.getTextBounds(labelText, 0, labelText.length, labelBounds)
        val pillPaddingH = dpToPx(8f)
        val pillPaddingV = dpToPx(3f)
        val pillW = labelBounds.width() + pillPaddingH * 2
        val pillH = labelBounds.height() + pillPaddingV * 2
        val pillRect = RectF(contentLeft, cursorY, contentLeft + pillW, cursorY + pillH)
        val pillBg   = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = withAlpha(cfg.accentColor, 35) }
        canvas.drawRoundRect(pillRect, pillH / 2, pillH / 2, pillBg)
        canvas.drawText(labelText, contentLeft + pillPaddingH, cursorY + pillH - pillPaddingV - dpToPx(1f), labelPaint)

        cursorY += pillH + dpToPx(7f)

        val titlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color    = Color.WHITE
            textSize = dpToPx(14.5f)
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
        }
        canvas.drawText(
            title.take(40) + if (title.length > 40) "…" else "",
            contentLeft, cursorY + titlePaint.textSize, titlePaint
        )
        cursorY += titlePaint.textSize + dpToPx(5f)

        val bodyPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color    = Color.parseColor("#AAAACC")
            textSize = dpToPx(12f)
        }
        canvas.drawText(
            body.take(52) + if (body.length > 52) "…" else "",
            contentLeft, cursorY + bodyPaint.textSize, bodyPaint
        )
        cursorY += bodyPaint.textSize + dpToPx(4f)

        val guidePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color    = Color.parseColor("#555577")
            textSize = dpToPx(10.5f)
        }
        canvas.drawText(cfg.guidanceLine, contentLeft, cursorY + guidePaint.textSize, guidePaint)

        val btnTop    = H.toFloat() - dpToPx(46f)
        val btnH      = dpToPx(34f)
        val btnRadius = dpToPx(10f)
        val btnLeft   = dpToPx(22f)
        val btnRight  = W.toFloat() - dpToPx(14f)
        val gap       = dpToPx(10f)
        val btnMid    = btnLeft + (btnRight - btnLeft) / 2f - gap / 2

        val declinePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.parseColor("#2A2A44") }
        canvas.drawRoundRect(RectF(btnLeft, btnTop, btnMid, btnTop + btnH), btnRadius, btnRadius, declinePaint)
        val btnTextPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color    = Color.parseColor("#CCCCDD")
            textSize = dpToPx(12.5f)
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            textAlign = Paint.Align.CENTER
        }
        canvas.drawText(cfg.declineLabel, btnLeft + (btnMid - btnLeft) / 2, btnTop + btnH * 0.63f, btnTextPaint)

        val acceptPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = cfg.accentColor }
        canvas.drawRoundRect(RectF(btnMid + gap, btnTop, btnRight, btnTop + btnH), btnRadius, btnRadius, acceptPaint)
        val acceptTextPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color    = Color.WHITE
            textSize = dpToPx(12.5f)
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            textAlign = Paint.Align.CENTER
        }
        canvas.drawText(
            cfg.acceptLabel,
            btnMid + gap + (btnRight - btnMid - gap) / 2,
            btnTop + btnH * 0.63f,
            acceptTextPaint
        )

        return bmp
    }

    @ReactMethod
    fun displayIncomingCall(
        uuid: String,
        name: String,
        info: String,
        avatarUrl: String?,
        payload: String?
    ) {
        Thread {
            try {
                android.util.Log.d("SociusCallModule", "displayIncomingCall: uuid=$uuid, name=$name, payload=$payload")
                val notifMgr = reactContext.getSystemService(Context.NOTIFICATION_SERVICE)
                        as NotificationManager
                
                if (!notifMgr.areNotificationsEnabled()) {
                    android.util.Log.e("SociusCallModule", "Notifications are DISABLED for this app!")
                }

                val cfg = resolveConfig(payload)
                android.util.Log.d("SociusCallModule", "Resolved config: $cfg")

                val soundResId = reactContext.resources.getIdentifier(
                    cfg.soundName, "raw", reactContext.packageName
                )
                
                val soundUri = if (soundResId != 0) {
                    android.net.Uri.parse("android.resource://${reactContext.packageName}/$soundResId")
                } else {
                    android.provider.Settings.System.DEFAULT_NOTIFICATION_URI
                }

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    val finalChannelId = cfg.channelId
                    val existing = notifMgr.getNotificationChannel(finalChannelId)
                    if (existing != null) {
                        notifMgr.deleteNotificationChannel(finalChannelId)
                    }
                    val channel = NotificationChannel(
                        finalChannelId,
                        cfg.channelName,
                        NotificationManager.IMPORTANCE_HIGH
                    ).apply {
                        description = "Socius ${cfg.channelName}"
                        enableLights(true)
                        lightColor  = cfg.lightColor
                        enableVibration(true)
                        vibrationPattern = longArrayOf(0, 500, 1000, 500, 1000)
                        setSound(soundUri, AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_ALARM)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build())
                        lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
                        setShowBadge(true)
                        setBypassDnd(true)
                    }
                    notifMgr.createNotificationChannel(channel)
                }

                val localIconName = if (cfg.channelId.contains("presence_alarm")) {
                    "notif_alarm_icon"
                } else {
                    "notif_help_icon"
                }

                val localIconId = reactContext.resources.getIdentifier(localIconName, "drawable", reactContext.packageName)
                
                var rawAvatar: Bitmap? = null

                if (!avatarUrl.isNullOrEmpty()) {
                    try {
                        val url = java.net.URL(avatarUrl)
                        val connection = url.openConnection() as java.net.HttpURLConnection
                        connection.doInput = true
                        connection.connect()
                        val input = connection.inputStream
                        rawAvatar = BitmapFactory.decodeStream(input)
                    } catch (e: Exception) { }
                }

                if (rawAvatar == null && localIconId != 0) {
                    rawAvatar = BitmapFactory.decodeResource(reactContext.resources, localIconId)
                }
                
                val finalAvatar = if (rawAvatar != null) {
                    toRoundedSquare(rawAvatar, 120, 25f)
                } else {
                    initialsAvatar(name, cfg.accentColor, 120)
                }

                fun activityIntent(action: String) =
                    PendingIntent.getActivity(
                        reactContext,
                        uuid.hashCode() + when (action) { "answer" -> 1; "fullscreen" -> 3; else -> 0 },
                        Intent(reactContext, MainActivity::class.java).apply {
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                            putExtra("call_uuid", uuid)
                            putExtra("action", action)
                            payload?.let { putExtra("payload", it) }
                        },
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )

                val acceptPendingIntent  = activityIntent("answer")
                val openPendingIntent = activityIntent("fullscreen")
                val fullScreenPendingIntent = PendingIntent.getActivity(
                    reactContext,
                    uuid.hashCode() + 31,
                    Intent(reactContext, LockScreenActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                        putExtra("call_uuid", uuid)
                        putExtra("name", name)
                        putExtra("info", info)
                        putExtra("avatar_url", avatarUrl ?: "")
                        payload?.let { putExtra("payload", it) }
                    },
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )

                val declinePendingIntent = PendingIntent.getBroadcast(
                    reactContext,
                    uuid.hashCode() + 2,
                    Intent(reactContext, NotificationReceiver::class.java).apply {
                        action = "ACTION_DECLINE_CALL"
                        putExtra("notification_id", uuid.hashCode())
                        putExtra("call_uuid", uuid)
                        payload?.let { putExtra("payload", it) }
                    },
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )

                val body  = cfg.bodyTemplate.replace("{info}", info)
                val isHelpRequest = cfg.channelId == "socius_help_alarm"
                val displayTitle = if (isHelpRequest) "Socius" else cfg.titleTemplate.replace("{name}", name)

                val smallIconRes = listOf(
                    "ic_notification",
                    "ic_launcher",
                    "mipmap/ic_launcher"
                ).firstNotNullOfOrNull { name ->
                    val id = if (name.contains("/")) {
                        val split = name.split("/")
                        reactContext.resources.getIdentifier(split[1], split[0], reactContext.packageName)
                    } else {
                        reactContext.resources.getIdentifier(name, "drawable", reactContext.packageName)
                    }
                    if (id != 0) id else null
                } ?: android.R.drawable.ic_dialog_info

                val channelId = cfg.channelId
                val notificationBuilder = NotificationCompat.Builder(reactContext, channelId)
                    .setSmallIcon(smallIconRes)
                    .setContentTitle(displayTitle)
                    .setContentText(body)
                    .setPriority(NotificationCompat.PRIORITY_MAX)
                    .setCategory(NotificationCompat.CATEGORY_CALL)
                    .setAutoCancel(true)
                    .setOngoing(true)
                    .setOnlyAlertOnce(true)
                    .setVibrate(longArrayOf(0, 500, 1000, 500, 1000))
                    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                    .setColorized(false)
                    .setContentIntent(openPendingIntent)
                    .setFullScreenIntent(fullScreenPendingIntent, true)
                    .setStyle(NotificationCompat.BigTextStyle().bigText(body))

                if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
                    notificationBuilder.setSound(soundUri)
                }
                
                notificationBuilder
                    .addAction(0, "Not available", declinePendingIntent)
                    .addAction(0, "View", acceptPendingIntent)
                    
                val notification = notificationBuilder.build()
                notification.flags = notification.flags or android.app.Notification.FLAG_INSISTENT

                notifMgr.notify(uuid.hashCode(), notification)
                android.util.Log.d("SociusCallModule", "Custom Layout Notification dispatched: ID=${uuid.hashCode()}")

            } catch (e: Exception) {
                e.printStackTrace()
            }
        }.start()
    }

    @ReactMethod
    fun cancelCallNotification(uuid: String) {
        (reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
            .cancel(uuid.hashCode())
    }

    override fun onNewIntent(intent: Intent) {
        val action  = intent.getStringExtra("action")    ?: return
        val uuid    = intent.getStringExtra("call_uuid") ?: return
        val payload = intent.getStringExtra("payload")
        try {
            (reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
                .cancel(uuid.hashCode())
        } catch (e: Exception) { }
        Arguments.createMap().apply {
            putString("action", action)
            putString("uuid", uuid)
            payload?.let { putString("payload", it) }
        }.also {
            if (reactContext.hasActiveCatalystInstance())
                reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("onCallAction", it)
        }
    }

    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {}

    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}

    @ReactMethod
    fun getInitialCallAction(promise: Promise) {
        try {
            val intent  = reactApplicationContext.currentActivity?.intent
            val action  = intent?.getStringExtra("action")
            val uuid    = intent?.getStringExtra("call_uuid")
            val payload = intent?.getStringExtra("payload")
            if (action != null && uuid != null) {
                try {
                    (reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
                        .cancel(uuid.hashCode())
                } catch (e: Exception) { }
                Arguments.createMap().apply {
                    putString("action", action)
                    putString("uuid", uuid)
                    payload?.let { putString("payload", it) }
                }.also {
                    intent.removeExtra("action")
                    intent.removeExtra("call_uuid")
                    intent.removeExtra("payload")
                    promise.resolve(it)
                }
            } else promise.resolve(null)
        } catch (e: Exception) { promise.reject("ERROR", e) }
    }

    @ReactMethod
    fun playMessageSound() {
        try {
            val context = reactContext
            val resId = context.resources.getIdentifier("message_count_sound", "raw", context.packageName)
            if (resId != 0) {
                val mediaPlayer = MediaPlayer.create(context, resId)
                mediaPlayer.setOnCompletionListener { mp -> mp.release() }
                mediaPlayer.start()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun playHelpRequestSound() {
        try {
            val context = reactContext
            val resId = context.resources.getIdentifier("help_request", "raw", context.packageName)
            if (resId != 0) {
                val attrs = AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
                val uri = Uri.parse("android.resource://${context.packageName}/$resId")
                val mediaPlayer = MediaPlayer().apply {
                    setAudioAttributes(attrs)
                    setDataSource(context, uri)
                    isLooping = false
                    prepare()
                    setOnCompletionListener { mp -> mp.release() }
                    start()
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun startHelpRequestRingtone() {
        startRingtoneByName("help_request")
    }

    @ReactMethod
    fun startPresenceAlarmRingtone() {
        startRingtoneByName("presence_alarm")
    }

    private fun startRingtoneByName(soundName: String) {
        try {
            val context = reactContext
            val resId = context.resources.getIdentifier(soundName, "raw", context.packageName)
            if (resId == 0) return
            stopRingtone()

            val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            val attrs = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val req = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
                    .setAudioAttributes(attrs)
                    .setOnAudioFocusChangeListener { }
                    .build()
                helpRequestFocusRequest = req
                audioManager.requestAudioFocus(req)
            } else {
                @Suppress("DEPRECATION")
                audioManager.requestAudioFocus(null, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
            }

            val uri = Uri.parse("android.resource://${context.packageName}/$resId")
            helpRequestPlayer = MediaPlayer().apply {
                setAudioAttributes(attrs)
                setDataSource(context, uri)
                isLooping = true
                prepare()
                start()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun stopRingtone() {
        try {
            helpRequestPlayer?.stop()
            helpRequestPlayer?.release()
            helpRequestPlayer = null
            val context = reactContext
            val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                helpRequestFocusRequest?.let { audioManager.abandonAudioFocusRequest(it) }
                helpRequestFocusRequest = null
            } else {
                @Suppress("DEPRECATION")
                audioManager.abandonAudioFocus(null)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
