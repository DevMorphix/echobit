# Add project specific ProGuard rules here.

# Capacitor / Cordova bridge — must not be obfuscated
-keep class com.getcapacitor.** { *; }
-keep class org.apache.cordova.** { *; }

# Keep readable stack traces in crash reports
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Google Auth Capacitor plugin
-keep class com.codetrixstudio.capacitor.GoogleAuth.** { *; }

# Firebase / Google services
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }

# WebView JS interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Suppress missing JDK internal class referenced by jlargearrays library
-dontwarn sun.misc.Cleaner
