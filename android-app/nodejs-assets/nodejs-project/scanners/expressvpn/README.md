# Express Scanner

اسکنر دسترسی سرورهای **ExpressVPN** از پشت DPI، ساخته‌شده با **Express**.
این پروژه لیست سرورها را به‌صورت زنده از منبع رسمی‌نمای ExpressVPN (دامنه‌ی واقعی `*.expressnetw.com`) دریافت می‌کند و در صورت قطعی به لیست محلی برمی‌گردد.

## ساختار

```
express/
├── server.js              # نقطه‌ی شروع — اپ Express را راه می‌اندازد
├── public/
│   └── index.html         # داشبورد سبک که از API استفاده می‌کند
└── src/
    ├── data/servers.js    # لیست سرورها
    ├── services/probe.js  # منطق DNS-over-HTTPS + TCP/TLS/ICMP probe
    └── routes/api.js      # روت‌های /api
```

## اجرا

```bash
git clone https://github.com/ScannerVpn/ExpressVpn.git
cd ExpressVpn
npm install
npm start          # یا: npm run dev  (با ری‌لود خودکار)
```

سپس مرورگر را باز کن: http://localhost:3003/

پورت پیش‌فرض `3003` است؛ با متغیر محیطی قابل تغییر: `PORT=4000 npm start`

## منبع لیست سرورها

ExpressVPN هیچ API عمومی JSON ندارد. به‌صورت پیش‌فرض، این پروژه لیست هاست‌نیم‌های واقعی ExpressVPN (`*.expressnetw.com`) را از فایل `LOCATIONS.txt` پروژه‌ی Zomboided به‌صورت زنده می‌گیرد، parse می‌کند و در صورت خطا به لیست محلی `src/data/servers.js` برمی‌گردد.

می‌توانی منبع دیگری (با فرمت متنی LOCATIONS یا JSON) را با متغیر محیطی زیر جایگزین کنی:

```bash
EXPRESS_SERVER_LIST_URL=https://example.com/express-servers npm start
```

منطق دریافت/parse/fallback در `src/data/index.js` پیاده شده است. وضعیت منبع در پاسخ `/api/servers` و `/api/data/status` با فیلد `source` برمی‌گردد (`expressvpn-live`، `remote` یا `static`).

## API

| Method | Endpoint | توضیح |
|---|---|---|
| GET | `/api/servers` | لیست همه‌ی سرورها + تعداد |
| GET | `/api/data/status` | وضعیت دیتاست |
| GET | `/api/ping?host=<hostname>` | probe یک سرور (DoH → TLS/TCP → ICMP) |

### نمونه پاسخ `/api/ping`

```json
{
  "host": "germany-frankfurt-1-ca-version-2.expressnetw.com",
  "ms": 84,
  "method": "tls443",
  "vpnAccessible": true,
  "ip": "x.x.x.x"
}
```

- `method: tls443` → TLS کامل شد، سرور واقعاً قابل استفاده است (`vpnAccessible: true`)
- `method: tcp443-syn` → TCP وصل شد ولی TLS قطع شد ⇒ احتمال DPI
- `method: icmp` → فقط ICMP جواب داد
- `ms: null` → هیچ روشی جواب نداد ⇒ بسته
```
