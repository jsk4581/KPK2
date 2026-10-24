# Dream Achieve Moments for Android

The lifelogging layer of Dream Achieve Moments (code name Second Draft). With your consent it records life events on the phone as lifelog items, keeps them on the device, and lets you review, delete and export them as JSON. It makes no judgments: the career brain reads the exported items.

## Build

Requirements: JDK 21 and an Android SDK with platform 37. Put `sdk.dir=<path to the SDK>` in `android/local.properties`.

```sh
cd android
./gradlew :app:testDebugUnitTest :app:assembleDebug
```
