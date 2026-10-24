-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class com.chatreel.studio.NativeDownloadBridge { *; }
-dontwarn android.webkit.*
