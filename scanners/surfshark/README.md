# 🦈 Surfshark Server Scanner — Iran DPI Detection

داشبورد دسکتاپ برای تست دسترسی‌پذیری سرورهای **Surfshark** از داخل ایران. این ابزار با دور زدن DNS poisoning و تشخیص DPI، نشان می‌دهد کدام سرورها واقعاً قابل استفاده‌اند.

> A desktop dashboard to test **Surfshark** VPN server reachability from inside Iran — bypasses DNS poisoning via DoH and detects DPI blocking.

---

## ✨ ویژگی‌ها / Features

- 📡 اسکن **۹۷ سرور** Surfshark در سراسر جهان
- 🔐 **DNS over HTTPS** (Cloudflare) برای دور زدن مسموم‌سازی DNS توسط ISP ایران
- 🚦 تشخیص سه وضعیت برای هر سرور:
  - **✓ VPN Accessible** — اتصال TLS موفق، سرور قابل استفاده
  - **⚠ DPI** — پورت باز است ولی TLS مسدود شده (احتمال DPI)
  - **✕ Blocked** — کاملاً مسدود
- ⚡ اسکن موازی (۱۲ درخواست همزمان) با نوار پیشرفت و دکمه توقف
- 🔍 جستجو، فیلتر و مرتب‌سازی بر اساس کشور، شهر و پینگ
- 🖥️ رابط کاربری فارسی (RTL) با تم تیره

---

## 📦 پیش‌نیازها / Requirements

- [Node.js](https://nodejs.org/) (نسخه ۱۸ یا بالاتر)

---

## 🚀 نصب و اجرا / Installation

```bash
# کلون کردن مخزن
git clone https://github.com/<USERNAME>/surfshark-scanner.git
cd surfshark-scanner

# نصب وابستگی‌ها (برای حالت Electron)
npm install
```

### روش‌های اجرا / Run

**۱) فقط مرورگر (سبک‌ترین روش):**

```bash
npm run server
```

سپس در مرورگر باز کنید: <http://localhost:3002/dashboard.html>

یا روی ویندوز کافیست فایل `surf_Start.bat` را اجرا کنید.
---

## 🛠️ نحوه کار / How It Works

برای هر سرور، منطق `bestPing` به ترتیب زیر اجرا می‌شود:

1. **DNS** — ابتدا DNS سیستم، در صورت شکست **DoH** از Cloudflare (دور زدن DNS poisoning)
2. **TLS 443** — اگر دست‌دهی TLS موفق شد → سرور قابل استفاده است ✓
3. **TCP 443** — اگر پورت باز بود ولی TLS رد شد → احتمال **DPI** ⚠
4. **ICMP** — به‌عنوان آخرین تست در دسترس بودن

> ⚠️ **یادآوری مهم:** قبل از اسکن، اپلیکیشن Surfshark را کاملاً ببندید تا نتیجه واقعی باشد.

---

## 📁 ساختار پروژه / Project Structure

| فایل | توضیح |
|------|-------|
| `surf_main.js` | نقطه ورود Electron |
| `surf_server.js` | سرور HTTP، لیست سرورها، منطق DNS/DPI |
| `surf_dashboard.html` | رابط کاربری داشبورد |
| `surf_Start.bat` | اجرای سریع روی ویندوز |
| `surf_package.json` | پیکربندی npm و Electron |

---

## ⚖️ سلب مسئولیت / Disclaimer

این ابزار صرفاً برای **تست تشخیصی شبکه** و مقاصد آموزشی است. این پروژه با Surfshark وابستگی رسمی ندارد. مسئولیت استفاده بر عهده کاربر است.

## 📄 License

[MIT](LICENSE)
