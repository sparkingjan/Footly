# Footly Android — website interface

Android 8.0+ app displaying **https://footlysj.vercel.app/** directly in a WebView. Version 1.1 replaces the separate native interface with the same responsive HTML, CSS, JavaScript, homepage video, animations, navigation, profile photos, team position maps, scorekeeping and community features as the website. Future website UI updates appear in the app without an APK update.

## App behavior
- Opens the website homepage with muted inline background video; playback follows the website's reduced-motion/data-saving preferences.
- Uses the website's Firebase account session. Its home-page Log out button works unchanged.
- No duplicate Android toolbar or bottom navigation.
- Android back gesture navigates website history, then exits.
- Native image picker supports website profile uploads. The website and server still enforce under 20 KB and the 365-day lock.
- Connection failures show a Retry screen. An internet connection and up-to-date Android System WebView are required.

## Optional Android notifications
Profile gains an Android notifications card only inside the app. Enabling requires a one-time sign-in through the official Firebase Android SDK with **the same account** as the website, followed by Android's notification permission. Website passwords and tokens are never sent through the JavaScript bridge. Only an account ID and enable/disable/status messages cross the bridge, restricted to the exact HTTPS website origin and top-level frame. Website logout disables native alerts and signs out the native notification session.

Match and community channels use live Firestore listeners while open and WorkManager checks approximately every 30 minutes in the background. These are **not instant closed-app push notifications**. Android battery management, network access, permissions and force-stop can delay or prevent delivery. Only the signed-in user's latest 20 owned matches and latest 20 community posts are checked; several events may be coalesced. Notification taps open the match centre or community page.

Firestore reads count against the existing free Firebase quota (up to about 1,920 document reads/day/device for full 40-document checks every 30 minutes, plus foreground usage). No billing upgrade or server credentials are introduced. Notifications require WebView's origin-restricted messaging support; update Android System WebView if the controls are unavailable.

## Security
- Only the exact HTTPS Footly origin stays inside the app. External HTTP(S)/email/phone links open through Android; arbitrary intent/file/data navigation is blocked.
- No legacy addJavascriptInterface bridge, wildcard origins or custom credential storage.
- TLS errors fail closed; mixed content and file URL access are disabled.
- Photo picker grants only selected content URIs.
- Existing Firebase ownership rules remain unchanged; native notification login must match the website account.
- App data is excluded from backup/device transfer. WebView sessions use normal app-private browser storage.

## Build and install
Open this directory in Android Studio, or use JDK 17+ and Android SDK 36:

    ./gradlew assembleDebug testDebugUnitTest lintDebug

Windows: gradlew.bat. Configure ANDROID_HOME or an ignored local.properties with sdk.dir.
APK: app/build/outputs/apk/debug/app-debug.apk.

This is a **debug-signed test APK**, not a Play Store release. Install over the previous debug build to update. A production release needs stable private signing, Play Console setup and store policy declarations.

Verification includes Android WebView configuration, exact-origin restrictions, notification routes/channels, website build checks and browser tests with Firebase emulators for account state, the notification bridge, profile upload, match setup/scoring and community. No physical Android phone or working emulator was available here; on-device video/keyboard/photo-picker/background-notification validation remains required before store release.
