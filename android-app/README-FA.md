# 📱 VPN Scanner Suite — نسخه‌ی اندروید

اپ اندرویدِ همان مجموعه‌ی ۸ اسکنر VPN. UI همان داشبوردهای وب است که داخل یک
WebView نمایش داده می‌شوند، و منطق اسکن توسط یک **Node.js واقعی (با OpenSSL)**
که داخل اپ اجرا می‌شود انجام می‌گیرد.

## چرا این معماری؟ (نکته‌ی فنی مهم)

اسکنرها دسترسی سرور را با **TLS handshake واقعی روی پورت ۴۴۳** تشخیص می‌دهند.

- WebView نمی‌تواند سوکت خام (TCP/TLS) بزند → منطق پروب باید سمت Node اجرا شود.
- TLS نیتیو اندروید **Conscrypt/BoringSSL** است؛ اثرانگشت ClientHello آن پشت DPI
  ریست می‌شود و همه‌ی سرورها «قرمز» می‌شوند.
- راه‌حل: اجرای **Node واقعی با OpenSSL** داخل اپ با
  [`nodejs-mobile-react-native`](https://github.com/nodejs-mobile/nodejs-mobile-react-native).
  در نتیجه رفتار پروب دقیقاً مثل نسخه‌ی دسکتاپ/وب است.

## معماری

```
android-app/
├── App.tsx                       Node را استارت می‌زند → روی رویداد shell-ready، WebView را به localhost وصل می‌کند
├── metro.config.js               پوشه‌ی nodejs-assets را از باندلر RN کنار می‌گذارد
└── nodejs-assets/nodejs-project/
    ├── main.js                   لانچرِ تک‌پروسه: هر ۸ اسکنر را require می‌کند + سرور پوسته روی 8080
    ├── shell.html                همان پوسته‌ی تب‌دار دسکتاپ
    └── scanners/                 کپی هر ۸ اسکنر + node_modules (express)
```

نکته: nodejs-mobile فقط یک پروسه‌ی Node دارد، پس برخلاف دسکتاپ نمی‌توان ۸ پروسه
spawn کرد. به‌جایش هر ۸ سرور در **همان پروسه** `require` می‌شوند (هرکدام روی پورت
پیش‌فرض خودش روی `127.0.0.1`). در `main.js` یک شیمِ `process.exit` گذاشته شده تا
خطای استارتِ یک اسکنر، کل Node را نکشد.

## پیش‌نیازهای ساخت

- Android SDK (پلتفرم ۳۴)، Build-Tools ۳۴، **NDK ۲۸.۲.۱۳۶۷۶۳۵۸**
- JDK ۱۷+ (مثلاً JDK داخل Android Studio: `…/Android Studio/jbr`)
- Node.js + npm

## ساخت APK

```bash
cd android-app
npm install

# باندل JS را به‌صورت standalone بساز (تا اپ بدون سرور Metro کار کند)
node node_modules/react-native/cli.js bundle \
  --platform android --dev false --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res

# سپس APK دیباگ
cd android
# JAVA_HOME را روی JDK 17+ بگذار، مثلاً:
#   export JAVA_HOME="/c/Program Files/Android/Android Studio/jbr"
./gradlew assembleDebug
```

خروجی: `android/app/build/outputs/apk/debug/app-debug.apk`

نصب روی گوشی/امولاتور:
```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

## نکات و محدودیت‌ها

- **حجم APK بزرگ است (~۲۷۶MB)** چون `libnode.so` برای سه ABI (arm64، armv7،
  x86_64) باندل می‌شود. برای کاهش حجم می‌توان با split-per-ABI فقط `arm64-v8a`
  (گوشی‌های واقعی امروزی) را ساخت.
- `child_process`/`ping` روی اندروید کار نمی‌کند → فقط fallbackِ ICMP می‌افتد؛
  تشخیص اصلی (TLS/TCP) سالم است.
- مسیرهای ویندوزیِ اسکنر Nord روی اندروید fail می‌شوند ولی try/catch موجود به
  fallback می‌رود (کرش نمی‌کند).
- APK دیباگ با کلید دیباگ امضا شده و قابل sideload است؛ برای انتشار رسمی باید
  نسخه‌ی release با کلید خودت امضا شود.
- مثل نسخه‌ی دسکتاپ: قبل از اسکن، VPN را خاموش کن.
