# Google Play Store — Setup & Submission Guide

## Overview

Since the app is already built in React Native, the same code runs on Android.
This guide walks through everything from first build to published app.

---

## Step 1 — Google Play Console Account

1. Go to **[play.google.com/console](https://play.google.com/console)**
2. Sign in with a Google account
3. Pay the **$25 one-time** registration fee (much cheaper than Apple's $99/year)
4. Fill in developer profile (name, email, phone)
5. Account is active **immediately** — no waiting period like Apple

---

## Step 2 — Firebase Android Setup

Just like iOS needs `GoogleService-Info.plist`, Android needs `google-services.json`.

1. Go to **[console.firebase.google.com](https://console.firebase.google.com)** → your project
2. Click **Add app** → Android icon
3. Enter package name: `com.gardenchurch` (must match `applicationId` in `android/app/build.gradle`)
4. Download `google-services.json`
5. Place it at: `android/app/google-services.json`
6. Add to `.gitignore`:
   ```
   android/app/google-services.json
   ```

---

## Step 3 — App Icons for Android

Android needs icons in multiple sizes AND a separate round icon.

From your `assets/AppIcons/android/` folder, copy icons to:
```
android/app/src/main/res/mipmap-mdpi/     (48x48)
android/app/src/main/res/mipmap-hdpi/     (72x72)
android/app/src/main/res/mipmap-xhdpi/    (96x96)
android/app/src/main/res/mipmap-xxhdpi/   (144x144)
android/app/src/main/res/mipmap-xxxhdpi/  (192x192)
```

Each folder needs:
- `ic_launcher.png` — standard icon
- `ic_launcher_round.png` — round version (Android uses this on most devices)

---

## Step 4 — Generate a Release Keystore

Android requires you to **sign** your app with a keystore before uploading to the Play Store.
**Keep this file safe — if you lose it, you cannot update your app ever again.**

Run this command in your terminal:

```bash
keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore android/app/release.keystore \
  -alias ourgarden \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

You'll be prompted for:
- A keystore password (save this somewhere secure)
- Your name, organization, city, state, country

Then add to `.gitignore`:
```
android/app/release.keystore
```

---

## Step 5 — Configure Signing in build.gradle

Add your keystore credentials to `android/gradle.properties` (not build.gradle — keeps secrets out of code):

```properties
RELEASE_STORE_FILE=release.keystore
RELEASE_KEY_ALIAS=ourgarden
RELEASE_STORE_PASSWORD=your_keystore_password
RELEASE_KEY_PASSWORD=your_key_password
```

Then update `android/app/build.gradle` signingConfigs:

```gradle
signingConfigs {
    release {
        storeFile file(RELEASE_STORE_FILE)
        storePassword RELEASE_STORE_PASSWORD
        keyAlias RELEASE_KEY_ALIAS
        keyPassword RELEASE_KEY_PASSWORD
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled true
        proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
    }
}
```

---

## Step 6 — Build the Release AAB

Google Play requires an **AAB** (Android App Bundle) format, not an APK.

```bash
cd android && ./gradlew bundleRelease
```

The output file will be at:
```
android/app/build/outputs/bundle/release/app-release.aab
```

---

## Step 7 — Create App in Play Console

1. Go to Play Console → **Create app**
2. Fill in:
   - App name: **Our Garden**
   - Default language: English
   - App or Game: **App**
   - Free or Paid: **Free**
3. Accept policies → Create app

---

## Step 8 — Fill In Store Listing

Under **Grow** → **Store presence** → **Main store listing**:

- **App name:** Our Garden
- **Short description:** (max 80 chars) — e.g. "Stay connected with your church community"
- **Full description:** (max 4000 chars) — describe the app features
- **Screenshots:** At least 2 phone screenshots (use your simulator or coworker's phone)
- **Feature graphic:** 1024×500 image (like a banner for the Play Store page)
- **App icon:** 512×512 PNG, no transparency

---

## Step 9 — Content Rating

Under **Policy** → **App content** → **Content ratings**:
- Fill out the questionnaire
- A church app will typically get **Everyone** rating

---

## Step 10 — Upload & Release

1. Go to **Release** → **Production** → **Create new release**
2. Upload your `.aab` file
3. Add release notes (e.g. "Initial release")
4. Click **Review release** → **Start rollout to Production**

Google reviews apps in **1–3 days** for new apps.

---

## Testing Before Release (Important)

Before submitting to Production, test via **Internal Testing**:

1. **Release** → **Internal testing** → **Create new release**
2. Upload AAB
3. Add testers by email under the **Testers** tab
4. Testers get a link to install via Play Store (no review needed for internal track)

This lets your coworker test the Android version immediately.

---

## Push Notifications on Android

Unlike iOS, Android does NOT require special certificates for push notifications.
Firebase works out of the box on Android once `google-services.json` is added.

The code in `src/lib/notifications.ts` already handles Android — no extra steps needed.

---

## Checklist for Google Play

- [ ] Google Play Console account ($25 one-time)
- [ ] Firebase Android app created, `google-services.json` downloaded
- [ ] Place `google-services.json` in `android/app/`
- [ ] Add Google Services plugin to build.gradle files
- [ ] App icons placed in correct mipmap folders
- [ ] Release keystore generated and stored safely
- [ ] `gradle.properties` updated with signing credentials
- [ ] `build.gradle` updated with release signing config
- [ ] Build AAB: `./gradlew bundleRelease`
- [ ] Play Console app listing filled out
- [ ] Screenshots and graphics uploaded
- [ ] Content rating completed
- [ ] Internal testing track used before production
- [ ] Submit for review
