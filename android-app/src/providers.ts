/**
 * متادیتای ۸ ارائه‌دهنده: شناسه، نام، ایموجی، پورتِ بک‌اند، و رنگ تأکید.
 * پورت‌ها همان پیش‌فرض‌های اسکنرها هستند (main.js آن‌ها را روی همین پورت‌ها بالا می‌آورد).
 */
export type ProviderId =
  | 'surfshark'
  | 'nord'
  | 'expressvpn'
  | 'purevpn'
  | 'mullvad'
  | 'pia'
  | 'windscribe'
  | 'proton';

export interface Provider {
  id: ProviderId;
  name: string;
  emoji: string;
  port: number;
  color: string;
}

export const PROVIDERS: Provider[] = [
  {id: 'surfshark', name: 'Surfshark', emoji: '🦈', port: 3002, color: '#1ebfbf'},
  {id: 'nord', name: 'NordVPN', emoji: '🛡️', port: 3000, color: '#4687ff'},
  {id: 'expressvpn', name: 'ExpressVPN', emoji: '🚀', port: 3003, color: '#da3940'},
  {id: 'purevpn', name: 'PureVPN', emoji: '💚', port: 3004, color: '#37b24d'},
  {id: 'mullvad', name: 'Mullvad', emoji: '🐭', port: 3005, color: '#f0a020'},
  {id: 'pia', name: 'PIA', emoji: '🔒', port: 3006, color: '#5b8c2a'},
  {id: 'windscribe', name: 'Windscribe', emoji: '🌬️', port: 3007, color: '#3aa6ff'},
  {id: 'proton', name: 'Proton VPN', emoji: '⚛️', port: 3008, color: '#8a6eff'},
];

export const THEME = {
  bg: '#0d1117',
  surface: '#161b22',
  surface2: '#1c2128',
  border: '#30363d',
  text: '#e6edf3',
  muted: '#8b949e',
  accent: '#2f81f7',
  green: '#3fb950',
  yellow: '#d29922',
  red: '#f85149',
};
