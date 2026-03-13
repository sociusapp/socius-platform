package com.socius.app

import android.app.NotificationManager
import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.socius.app.R
import org.json.JSONObject

class LockScreenActivity : AppCompatActivity() {

    private var callUuid: String? = null
    private var payload: String? = null

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
        val name = intent.getStringExtra("name") ?: "Unknown"
        val info = intent.getStringExtra("info") ?: ""

        // Setup UI
        setupUI(name, info, payload)

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

    private fun setupUI(name: String, info: String, payloadStr: String?) {
        val type = try {
            val json = JSONObject(payloadStr ?: "{}")
            json.optString("type", "")
        } catch (e: Exception) { "" }

        val tvType = findViewById<TextView>(R.id.tv_type)
        val tvTitle = findViewById<TextView>(R.id.tv_title)
        val tvBody = findViewById<TextView>(R.id.tv_body)
        val tvInfo = findViewById<TextView>(R.id.tv_info)
        val ivIcon = findViewById<ImageView>(R.id.iv_icon)
        val btnAccept = findViewById<LinearLayout>(R.id.btn_accept)
        val tvAcceptLabel = findViewById<TextView>(R.id.tv_accept_label)
        val tvDeclineLabel = findViewById<TextView>(R.id.tv_decline_label)
        val bgOverlay = findViewById<android.view.View>(R.id.bg_overlay)

        tvType.text = "Socius"
        bgOverlay.setBackgroundColor(android.graphics.Color.parseColor("#000000"))

        if (type == "PRESENCE_ALARM") {
            ivIcon.setImageResource(R.drawable.notif_alarm_icon)
        } else {
            ivIcon.setImageResource(R.drawable.notif_help_icon)
        }

        if (type == "PRESENCE_ALARM") {
            btnAccept.setBackgroundResource(R.drawable.bg_btn_answer)
            tvAcceptLabel.text = "Answer"
            tvDeclineLabel.text = "Decline"
            tvTitle.text = name
            tvBody.text = "Incoming voice call"
            tvInfo.text = info
        } else {
            btnAccept.setBackgroundResource(R.drawable.bg_btn_answer)
            tvAcceptLabel.text = "View"
            tvDeclineLabel.text = "Not available"
            tvTitle.text = "Help Request"
            tvBody.text = "Someone nearby needs help"
            tvInfo.text = info
        }
    }

    private fun acceptCall() {
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
        val intent = Intent(this, NotificationReceiver::class.java).apply {
            action = "ACTION_DECLINE_CALL"
            putExtra("call_uuid", callUuid)
            putExtra("notification_id", callUuid?.hashCode() ?: 0)
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
        super.onDestroy()
    }
}
