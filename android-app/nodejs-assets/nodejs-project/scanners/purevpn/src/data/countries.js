'use strict';

// نگاشت کد کشور (ISO alpha-2 که در hostname های PureVPN استفاده شده) به نام فارسی و پرچم.
// نکته: PureVPN برای بریتانیا از کد غیراستاندارد "uk" استفاده می‌کند (به جای gb).
const COUNTRIES = {
  ae: { name: 'امارات',                flag: '🇦🇪' },
  af: { name: 'افغانستان',             flag: '🇦🇫' },
  al: { name: 'آلبانی',                flag: '🇦🇱' },
  ao: { name: 'آنگولا',                flag: '🇦🇴' },
  ar: { name: 'آرژانتین',              flag: '🇦🇷' },
  at: { name: 'اتریش',                 flag: '🇦🇹' },
  au: { name: 'استرالیا',              flag: '🇦🇺' },
  aw: { name: 'آروبا',                 flag: '🇦🇼' },
  bb: { name: 'باربادوس',              flag: '🇧🇧' },
  bd: { name: 'بنگلادش',               flag: '🇧🇩' },
  be: { name: 'بلژیک',                 flag: '🇧🇪' },
  bg: { name: 'بلغارستان',             flag: '🇧🇬' },
  bh: { name: 'بحرین',                 flag: '🇧🇭' },
  bm: { name: 'برمودا',                flag: '🇧🇲' },
  bn: { name: 'برونئی',                flag: '🇧🇳' },
  bo: { name: 'بولیوی',                flag: '🇧🇴' },
  br: { name: 'برزیل',                 flag: '🇧🇷' },
  bs: { name: 'باهاما',                flag: '🇧🇸' },
  ca: { name: 'کانادا',                flag: '🇨🇦' },
  ch: { name: 'سوئیس',                 flag: '🇨🇭' },
  cl: { name: 'شیلی',                  flag: '🇨🇱' },
  cz: { name: 'جمهوری چک',             flag: '🇨🇿' },
  de: { name: 'آلمان',                 flag: '🇩🇪' },
  dk: { name: 'دانمارک',               flag: '🇩🇰' },
  dz: { name: 'الجزایر',               flag: '🇩🇿' },
  ee: { name: 'استونی',                flag: '🇪🇪' },
  eg: { name: 'مصر',                   flag: '🇪🇬' },
  es: { name: 'اسپانیا',               flag: '🇪🇸' },
  fi: { name: 'فنلاند',                flag: '🇫🇮' },
  fr: { name: 'فرانسه',                flag: '🇫🇷' },
  gr: { name: 'یونان',                 flag: '🇬🇷' },
  hk: { name: 'هنگ‌کنگ',               flag: '🇭🇰' },
  hu: { name: 'مجارستان',              flag: '🇭🇺' },
  ie: { name: 'ایرلند',                flag: '🇮🇪' },
  in: { name: 'هند',                   flag: '🇮🇳' },
  it: { name: 'ایتالیا',               flag: '🇮🇹' },
  jp: { name: 'ژاپن',                  flag: '🇯🇵' },
  kr: { name: 'کره جنوبی',             flag: '🇰🇷' },
  ky: { name: 'جزایر کِیمن',           flag: '🇰🇾' },
  lt: { name: 'لیتوانی',               flag: '🇱🇹' },
  lu: { name: 'لوکزامبورگ',            flag: '🇱🇺' },
  lv: { name: 'لتونی',                 flag: '🇱🇻' },
  mc: { name: 'موناکو',                flag: '🇲🇨' },
  md: { name: 'مولداوی',               flag: '🇲🇩' },
  ng: { name: 'نیجریه',                flag: '🇳🇬' },
  nl: { name: 'هلند',                  flag: '🇳🇱' },
  no: { name: 'نروژ',                  flag: '🇳🇴' },
  om: { name: 'عمان',                  flag: '🇴🇲' },
  pa: { name: 'پاناما',                flag: '🇵🇦' },
  ph: { name: 'فیلیپین',               flag: '🇵🇭' },
  pl: { name: 'لهستان',                flag: '🇵🇱' },
  pr: { name: 'پورتوریکو',             flag: '🇵🇷' },
  pt: { name: 'پرتغال',                flag: '🇵🇹' },
  ro: { name: 'رومانی',                flag: '🇷🇴' },
  rs: { name: 'صربستان',               flag: '🇷🇸' },
  ru: { name: 'روسیه',                 flag: '🇷🇺' },
  se: { name: 'سوئد',                  flag: '🇸🇪' },
  sg: { name: 'سنگاپور',               flag: '🇸🇬' },
  sk: { name: 'اسلواکی',               flag: '🇸🇰' },
  tr: { name: 'ترکیه',                 flag: '🇹🇷' },
  uk: { name: 'بریتانیا',              flag: '🇬🇧' },
  us: { name: 'آمریکا',                flag: '🇺🇸' },
  vg: { name: 'جزایر ویرجین بریتانیا', flag: '🇻🇬' },
  vn: { name: 'ویتنام',                flag: '🇻🇳' },
  za: { name: 'آفریقای جنوبی',         flag: '🇿🇦' },
};

// نگاشت پسوند پروتکل در hostname به برچسب خوانا.
const PROTOCOLS = {
  ikev:    'IKEv2',
  ipsec:   'IPSec',
  tcp:     'OpenVPN TCP',
  'udp-obf': 'OpenVPN UDP (Obf)',
  'global-tcp2': 'Global TCP',
};

// از hostname هایی مثل "ae2-auto-ikev.ptoserver.com" یا "be-ikev-pf.ptoserver.com"
// کد کشور و پروتکل را استخراج می‌کند.
function parseHostname(hostname) {
  const base = String(hostname).replace(/\.[a-z0-9.-]+$/i, ''); // حذف دامنه (.ptoserver.com)
  const segments = base.split('-');

  const codeMatch = segments[0].match(/^([a-z]{2})/i);
  const code = codeMatch ? codeMatch[1].toLowerCase() : null;
  const meta = code && COUNTRIES[code] ? COUNTRIES[code] : null;

  // پروتکل: آخرین بخش معنی‌دار (با در نظر گرفتن udp-obf و پسوند pf)
  const rest = segments.slice(1).filter(s => s !== 'auto' && s !== 'pf');
  let protoKey = rest.join('-');
  if (!PROTOCOLS[protoKey] && rest.length) protoKey = rest[rest.length - 1];
  let protocol = PROTOCOLS[protoKey] || (rest.length ? rest.join(' ').toUpperCase() : 'نامشخص');
  if (segments.includes('pf')) protocol += ' + PF';

  return {
    code: meta ? code.toUpperCase() : 'XX',
    country: meta ? meta.name : 'نامشخص',
    flag: meta ? meta.flag : '🏳️',
    protocol,
  };
}

module.exports = { COUNTRIES, PROTOCOLS, parseHostname };
