# Footly for Android

A native Java Android application (Android 8.0/API 26 or newer), using the same Firebase accounts, registered-player directory, matches, rosters, community posts and profile photos as https://footlysj.vercel.app/. There is no WebView.

## Included
- Email/password sign-in, signup, password reset and logout.
- Recent matches, native create-match form, registered-player selection, unequal sides, draggable position maps and role selection.
- Transactional goals/cards/assists/substitutions, revision conflict detection, undo last event, lineups, scorers and commentary.
- Community posting and deletion of your own posts.
- Shared profile photos under 20,000 bytes with the existing server-enforced 365-day replacement lock.
- Opt-in match and community notification channels. Notification taps open the appropriate section.
- Your supplied Footly logo.

## Notification delivery and free-plan limits
This version uses Firestore listeners while the app is open and Android WorkManager background checks approximately every 30 minutes with network connectivity. It does **not** implement Firebase Cloud Messaging or instant closed-app push. Android battery restrictions, force-stop, loss of connectivity and notification permission settings can delay or prevent background delivery. Open the app again after a force-stop.

Only matches owned by the signed-in account are readable under the existing Firestore rules; this app does not broaden those permissions. Each check covers the latest 20 matches and 20 community posts. Several changes may be coalesced into one notification; older matches outside that window are not monitored. Each device uses Firebase reads from the shared Spark quota (up to about 1,920 document reads per day at 40 reads every 30 minutes, plus foreground reads). This is suitable for initial testing, not a million-request capacity promise.

Notifications are disabled by default. Enable them in Profile and grant Android's notification permission. Logout cancels scheduled work and notifications. A worker checks the active account again before showing results. Lock-screen notifications hide match details by default.

## Build
Install JDK 17 or newer and Android SDK 36/build tools. Use Android Studio to open this directory, or set ANDROID_HOME and JAVA_HOME and run:

    ./gradlew assembleDebug testDebugUnitTest lintDebug

On Windows use gradlew.bat. A local.properties file may specify sdk.dir; it must not be committed.
Output: app/build/outputs/apk/debug/app-debug.apk.

The Firebase Android client is registered as app.footly.android in footly-b4c3e. Public client configuration is initialized in FootlyApp.java. No service-account credentials or billing changes are needed. Security comes from Firebase Authentication and the existing Firestore rules, not hiding the client API key.

## Installation / release
The generated APK is a **debug-signed test build**, installable on an Android phone after allowing installation from the transferring app. This is not a Play Store release. Keep a stable private release signing key outside Git and configure a release signing workflow before publishing; Play Console setup, privacy policy/data safety declarations and store review are separate.

No phone was connected and the local Android emulator installation was incomplete when this app was created. The JVM UI smoke tests cannot replace physical-device validation. Before a store release, test real-device login/signup, website-to-app match synchronization, rotation/backgrounding, photo picker and annual lock, notification permissions on Android 13+, background notifications and account switching. Existing legacy matches are viewable but must be edited from the website.

The app shows the 20 most recent matches. Player selection loads 50 names at a time. Profile account deletion and full historical statistics are not implemented in this first native version.
