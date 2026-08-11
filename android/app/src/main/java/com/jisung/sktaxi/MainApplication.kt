package com.jisung.sktaxi

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    createNotificationChannels()
    loadReactNative(this)
  }

  /**
   * Android 8.0+에서는 NotificationChannel의 사운드가 채널 생성 시점에 고정된다.
   * 커스텀 사운드를 사용하려면 채널을 사전에 만들어 두고,
   * FCM payload에서 channelId를 해당 채널로 지정해야 한다.
   */
  private fun createNotificationChannels() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

    val notificationManager = getSystemService(NotificationManager::class.java) ?: return
    val audioAttributes = AudioAttributes.Builder()
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .setUsage(AudioAttributes.USAGE_NOTIFICATION)
      .build()

    fun channel(id: String, name: String, soundResName: String): NotificationChannel {
      val uri = Uri.parse("android.resource://${packageName}/raw/$soundResName")
      return NotificationChannel(id, name, NotificationManager.IMPORTANCE_HIGH).apply {
        setSound(uri, audioAttributes)
        enableVibration(true)
        enableLights(true)
      }
    }

    val channels = listOf(
      channel("chat_channel", "채팅 알림", "new_chat_notification"),
      channel("party_channel", "택시 파티 알림", "new_taxi_party"),
      channel("notice_channel", "공지 알림", "new_notice")
    )

    notificationManager.createNotificationChannels(channels)
  }
}
