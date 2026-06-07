# 🟢 PureVPN Scanner

اسکنر سادهٔ مبتنی بر **Express** که در دسترس‌بودن سرورهای PureVPN را از پشت DPI/فیلترینگ بررسی می‌کند. لیست سرورها به‌صورت استاتیک همراه پروژه است و برای هر سرور، کشور، پرچم و نوع پروتکل به‌صورت خودکار از روی نام دامنه استخراج می‌شود.

![node](https://img.shields.io/badge/node-%3E%3D18-green) ![express](https://img.shields.io/badge/express-5.x-blue)

## ✨ امکانات

- **۲۶۰ سرور PureVPN** از ۶۵ کشور، با تشخیص خودکار:
  - کشور + پرچم (از روی کد کشور در hostname)
  - پروتکل: `IKEv2` / `IPSec` / `OpenVPN TCP` / `OpenVPN UDP (Obf)`
- **بررسی دسترسی هر سرور** با چند روش پشت‌سرهم:
  - حل نام از طریق DNS سیستم + fallback روی DNS-over-HTTPS کلودفلر
  - هندشیک TLS روی پورت ۴۴۳
  - اتصال خام TCP روی پورت ۴۴۳/۸۰
  - پینگ ICMP
- داشبورد فارسی (RTL) با فیلتر زنده بر اساس کشور/پروتکل/نام.

## 🚦 معنی وضعیت‌ها

| نشان | معنی |
|------|------|
| ✅ **باز** | اتصال (TLS یا TCP) برقرار شد — سرور از این شبکه در دسترس است |
| ⚠ **DPI** | هاست با ICMP جواب می‌دهد ولی پورت‌های TCP فیلتر شده‌اند (نشانهٔ DPI) |
| ❌ **بسته** | هیچ پاسخی دریافت نشد |
| ⛔ **بدون DNS** | نام دامنه در DNS عمومی قابل‌حل نیست (NXDOMAIN) |

> نکته: اگر اکثر سرورها روی شبکهٔ شما `DPI` یا `بسته` نشان دادند ولی روی شبکهٔ آزاد `باز` می‌شوند، یعنی شبکهٔ شما در حال فیلترکردن آن سرورهاست — نه باگ اسکنر. برای تست واقعی، فیلترشکن را روشن کرده و دوباره «اسکن همه» را بزنید.

## 🛠 اجرا

```bash
git clone https://github.com/ScannerVpn/PureVpn.git
cd PureVpn
npm install
npm start
```

سپس مرورگر را باز کنید: `http://localhost:3004/`

اجرا روی پورت دلخواه:

```bash
PORT=3099 npm start
```

حالت توسعه (ری‌استارت خودکار):

```bash
npm run dev
```

## 📡 API

| متد و مسیر | توضیح |
|------------|-------|
| `GET /api/servers` | لیست کامل سرورها به‌همراه کشور/پرچم/پروتکل |
| `GET /api/data/status` | تعداد سرورها و منبع داده (static یا remote) |
| `GET /api/ping?host=<hostname>` | بررسی دسترسی یک سرور |

نمونهٔ پاسخ `ping`:

```json
{ "host": "de-ikev.ptoserver.com", "ms": 353, "method": "tcp443", "vpnAccessible": true, "ip": "5.254.13.68" }
```

`method` یکی از این مقادیر است: `tls443` · `tcp443` · `tcp80` · `icmp` · `dns-fail`.

## 📁 ساختار

```
.
├── server.js                 # ورودی اپ + CORS + فایل‌های استاتیک
├── package.json
├── public/
│   └── index.html            # داشبورد فارسی (RTL)
└── src/
    ├── data/
    │   ├── index.js          # نرمال‌سازی و بارگذاری سرورها (static/remote)
    │   ├── servers.js        # لیست استاتیک hostnameها
    │   └── countries.js      # نگاشت کد کشور→نام/پرچم + استخراج پروتکل
    ├── routes/
    │   └── api.js            # روت‌های API
    └── services/
        └── probe.js          # probe با TLS / TCP / ICMP و DNS-over-HTTPS
```

## ⚖️ لایسنس

MIT
