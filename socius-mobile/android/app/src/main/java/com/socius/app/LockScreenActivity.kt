package com.socius.app

import android.app.NotificationManager
import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.animation.ObjectAnimator
import android.animation.AnimatorSet
import android.animation.ValueAnimator
import android.view.WindowManager
import android.graphics.BitmapFactory
import android.widget.LinearLayout
import android.widget.TextView
import android.view.View
import android.view.animation.AccelerateDecelerateInterpolator
import androidx.appcompat.app.AppCompatActivity
import com.socius.app.R
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import kotlin.math.roundToInt
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class LockScreenActivity : AppCompatActivity() {

    private var callUuid: String? = null
    private var payload: String? = null
    private var avatarUrl: String? = null
    private var ringtonePlayer: MediaPlayer? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Ensure screen turns on and shows over lock screen
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
            val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
            keyguardManager.requestDismissKeyguard(this, null)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
            )
        }
        
        // Full screen flags
        window.addFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN or
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_ALLOW_LOCK_WHILE_SCREEN_ON
        )

        setContentView(R.layout.activity_lock_screen)

        // Extract data
        callUuid = intent.getStringExtra("call_uuid")
        payload = intent.getStringExtra("payload")
        avatarUrl = intent.getStringExtra("avatar_url")
        val name = intent.getStringExtra("name") ?: "Unknown"
        val info = intent.getStringExtra("info") ?: ""

        // Setup UI
        setupUI(name, info, payload, avatarUrl)
        startPulseAnimation()
        startEntranceAnimation()
        startLockscreenRingtone(payload)

        // Button Listeners
        findViewById<LinearLayout>(R.id.btn_accept).setOnClickListener {
            acceptCall()
        }

        findViewById<LinearLayout>(R.id.btn_decline).setOnClickListener {
            declineCall()
        }
    }

    override fun onUserLeaveHint() {
        finish()
        super.onUserLeaveHint()
    }

    override fun onBackPressed() {
        finish()
    }

    private fun setupUI(name: String, info: String, payloadStr: String?, avatarUrl: String?) {
        val json = try {
            JSONObject(payloadStr ?: "{}")
        } catch (e: Exception) {
            JSONObject()
        }
        val type = json.optString("type", "")

        val tvType = findViewById<TextView>(R.id.tv_type)
        val tvTitle = findViewById<TextView>(R.id.tv_title)
        val tvBody = findViewById<TextView>(R.id.tv_body)
        val tvCategory = findViewById<TextView>(R.id.tv_category)
        val tvDescription = findViewById<TextView>(R.id.tv_description)
        val tvLocation = findViewById<TextView>(R.id.tv_location)
        val tvTimeNeeded = findViewById<TextView>(R.id.tv_time_needed)
        val tvReturnBy = findViewById<TextView>(R.id.tv_return_by)
        val btnAccept = findViewById<LinearLayout>(R.id.btn_accept)
        val tvAcceptLabel = findViewById<TextView>(R.id.tv_accept_label)
        val tvDeclineLabel = findViewById<TextView>(R.id.tv_decline_label)

        tvType.text = "Socius"

        if (type == "PRESENCE_ALARM") {
            btnAccept.setBackgroundResource(R.drawable.bg_btn_answer)
            tvAcceptLabel.text = "Answer"
            tvDeclineLabel.text = "Decline"
            tvTitle.text = name
            tvBody.text = "Someone nearby feels unsafe"
            tvCategory.text = "Presence Alert"
            tvDescription.text = "—"
            tvLocation.text = info
            tvTimeNeeded.text = "Immediate"
            tvReturnBy.text = "As soon as possible"
        } else {
            btnAccept.setBackgroundResource(R.drawable.bg_btn_answer)
            tvAcceptLabel.text = "View"
            tvDeclineLabel.text = "Not available"
            tvTitle.text = "Help Request"
            tvBody.text = "Someone nearby needs help"

            val categoryName = json.optString("categoryName", "").trim()
            val category = json.optString("category", "").trim()
            val description = json.optString("description", "").trim()
            val area = json.optString("area", "").trim()
            val distanceMeters = json.optString("distanceMeters", "").trim()
            val timeNeeded = json.optString("time", "").trim()
                .ifEmpty { json.optString("requestedDurationLabel", "").trim() }
            val returnByRaw = json.optString("returnBy", "").trim()
                .ifEmpty { json.optString("itemReturnBy", "").trim() }

            val displayCategory = (if (categoryName.isNotEmpty()) categoryName else category)
                .replace("_", " ")
                .uppercase()
                .ifEmpty { "HELP REQUEST" }

            tvCategory.text = displayCategory
            tvDescription.text = if (description.isNotEmpty()) description else "—"
            tvLocation.text = if (area.isNotEmpty()) area else "—"
            tvTimeNeeded.text = if (timeNeeded.isNotEmpty()) timeNeeded else "About 30 minutes"
            tvReturnBy.text = formatReturnBy(returnByRaw)

            val meters = distanceMeters.toIntOrNull()
            val distanceHint = if (meters != null) {
                if (meters < 1000) "${meters}m away" else "${((meters / 100f).roundToInt() / 10f)} km away"
            } else {
                info
            }
            if (tvLocation.text.isBlank() || tvLocation.text == "—") {
                tvLocation.text = distanceHint
            }
        }
    }

    private fun formatReturnBy(raw: String): String {
        if (raw.isBlank()) return "Today"
        val ts = raw.toLongOrNull()
        if (ts != null) {
            return try {
                val df = SimpleDateFormat("MMM d, h:mm a", Locale.getDefault())
                df.format(Date(ts))
            } catch (e: Exception) {
                raw
            }
        }
        return raw
    }

    private fun acceptCall() {
        stopLockscreenRingtone()
        val uuid = callUuid
        if (!uuid.isNullOrEmpty()) {
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.cancel(uuid.hashCode())
        }
        
        // Send event to React Native
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("call_uuid", callUuid)
            putExtra("action", "answer")
            putExtra("payload", payload)
        }
        startActivity(intent)

        // Also send a broadcast to handle in RN
        val broadcastIntent = Intent("com.socius.app.ACCEPT_CALL").apply {
            putExtra("call_uuid", callUuid)
            putExtra("payload", payload)
        }
        sendBroadcast(broadcastIntent)

        finish()
    }

    private fun declineCall() {
        stopLockscreenRingtone()
        val intent = Intent(this, NotificationReceiver::class.java).apply {
            action = "ACTION_DECLINE_CALL"
            putExtra("call_uuid", callUuid)
            putExtra("notification_id", callUuid?.hashCode() ?: 0)
            putExtra("payload", payload)
        }
        sendBroadcast(intent)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            finishAndRemoveTask()
        } else {
            finish()
        }

        startActivity(
            Intent(Intent.ACTION_MAIN).apply {
                addCategory(Intent.CATEGORY_HOME)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
        )
    }

    override fun onDestroy() {
        stopLockscreenRingtone()
        super.onDestroy()
    }

    private fun startPulseAnimation() {
        val outer = findViewById<View>(R.id.pulse_outer) ?: return
        val inner = findViewById<View>(R.id.pulse_inner) ?: return

        val outerScaleX = ObjectAnimator.ofFloat(outer, View.SCALE_X, 1f, 1.9f).apply {
            duration = 1200
            repeatCount = ValueAnimator.INFINITE
            repeatMode = ValueAnimator.RESTART
        }
        val outerScaleY = ObjectAnimator.ofFloat(outer, View.SCALE_Y, 1f, 1.9f).apply {
            duration = 1200
            repeatCount = ValueAnimator.INFINITE
            repeatMode = ValueAnimator.RESTART
        }
        val outerAlpha = ObjectAnimator.ofFloat(outer, View.ALPHA, 0.24f, 0.05f).apply {
            duration = 1200
            repeatCount = ValueAnimator.INFINITE
            repeatMode = ValueAnimator.RESTART
        }
        AnimatorSet().apply {
            playTogether(outerScaleX, outerScaleY, outerAlpha)
            start()
        }

        val innerScaleX = ObjectAnimator.ofFloat(inner, View.SCALE_X, 1f, 1.35f).apply {
            duration = 1000
            repeatCount = ValueAnimator.INFINITE
            repeatMode = ValueAnimator.RESTART
        }
        val innerScaleY = ObjectAnimator.ofFloat(inner, View.SCALE_Y, 1f, 1.35f).apply {
            duration = 1000
            repeatCount = ValueAnimator.INFINITE
            repeatMode = ValueAnimator.RESTART
        }
        val innerAlpha = ObjectAnimator.ofFloat(inner, View.ALPHA, 0.32f, 0.12f).apply {
            duration = 1000
            repeatCount = ValueAnimator.INFINITE
            repeatMode = ValueAnimator.RESTART
        }
        AnimatorSet().apply {
            playTogether(innerScaleX, innerScaleY, innerAlpha)
            start()
        }
    }

    private fun startEntranceAnimation() {
        val card = findViewById<View>(R.id.card_container) ?: return
        val decline = findViewById<View>(R.id.btn_decline) ?: return
        val accept = findViewById<View>(R.id.btn_accept) ?: return

        card.alpha = 0f
        card.translationY = 28f
        card.animate()
            .alpha(1f)
            .translationY(0f)
            .setDuration(420)
            .setInterpolator(AccelerateDecelerateInterpolator())
            .start()

        decline.alpha = 0f
        decline.translationY = 20f
        decline.animate()
            .alpha(1f)
            .translationY(0f)
            .setStartDelay(140)
            .setDuration(360)
            .setInterpolator(AccelerateDecelerateInterpolator())
            .start()

        accept.alpha = 0f
        accept.translationY = 20f
        accept.animate()
            .alpha(1f)
            .translationY(0f)
            .setStartDelay(210)
            .setDuration(360)
            .setInterpolator(AccelerateDecelerateInterpolator())
            .start()

        val breatheX = ObjectAnimator.ofFloat(accept, View.SCALE_X, 1f, 1.04f, 1f).apply {
            duration = 1600
            repeatCount = ValueAnimator.INFINITE
            repeatMode = ValueAnimator.RESTART
        }
        val breatheY = ObjectAnimator.ofFloat(accept, View.SCALE_Y, 1f, 1.04f, 1f).apply {
            duration = 1600
            repeatCount = ValueAnimator.INFINITE
            repeatMode = ValueAnimator.RESTART
        }
        AnimatorSet().apply {
            playTogether(breatheX, breatheY)
            startDelay = 700
            start()
        }
    }

    private fun startLockscreenRingtone(payloadStr: String?) {
        try {
            val json = try { JSONObject(payloadStr ?: "{}") } catch (e: Exception) { JSONObject() }
            val type = json.optString("type", "")
            val soundName = if (type == "PRESENCE_ALARM") "presence_alarm" else "help_request"
            val resId = resources.getIdentifier(soundName, "raw", packageName)
            if (resId == 0) return

            stopLockscreenRingtone()
            val attrs = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()

            ringtonePlayer = MediaPlayer().apply {
                setAudioAttributes(attrs)
                setDataSource(this@LockScreenActivity, Uri.parse("android.resource://$packageName/$resId"))
                isLooping = true
                prepare()
                start()
            }
        } catch (e: Exception) { }
    }

    private fun stopLockscreenRingtone() {
        try {
            ringtonePlayer?.stop()
            ringtonePlayer?.release()
            ringtonePlayer = null
        } catch (e: Exception) { }
    }
}
