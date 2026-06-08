/**
 * VPN Scanner Suite — اپ اندروید (رابط نیتیو)
 *
 * یک پروسه‌ی Node واقعی (nodejs-mobile، با OpenSSL) داخل اپ اجرا می‌شود که هر
 * ۸ اسکنر را روی پورت‌های لوکال بالا می‌آورد. رابط کاربری کاملاً نیتیو است:
 * لیست سرورها از JSON باندل‌شده خوانده می‌شود (همیشه آفلاین کار می‌کند) و فقط
 * «پینگ» به بک‌اند Node می‌رود. این هم مشکل «فقط Surfshark» و هم UI خراب وب را
 * حل می‌کند.
 */
import React, {useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import nodejs from 'nodejs-mobile-react-native';
import {PROVIDERS, ProviderId, THEME} from './src/providers';
import ProviderTabs from './src/components/ProviderTabs';
import ScannerScreen from './src/screens/ScannerScreen';

function App(): React.JSX.Element {
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('در حال راه‌اندازی موتور اسکنر…');
  const [active, setActive] = useState<ProviderId>('surfshark');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;
    nodejs.start('main.js', {redirectOutputToLogcat: true});

    const onMessage = (msg: string) => {
      if (typeof msg === 'string' && msg.length < 80) {
        setStatus(msg);
      }
    };
    const onReady = () => setReady(true);

    nodejs.channel.addListener('message', onMessage);
    nodejs.channel.addListener('shell-ready', onReady);

    // اگر به هر دلیل پیام ready نرسید، بعد از مدتی خودمان رابط را نشان می‌دهیم
    // (لیست‌ها باندل‌شده‌اند و بدون بک‌اند هم نمایش داده می‌شوند؛ فقط پینگ نیاز
    // به بک‌اند دارد).
    const fallback = setTimeout(() => setReady(true), 9000);

    return () => {
      clearTimeout(fallback);
      nodejs.channel.removeListener('message', onMessage);
      nodejs.channel.removeListener('shell-ready', onReady);
    };
  }, []);

  const activeProvider = PROVIDERS.find(p => p.id === active) || PROVIDERS[0];

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.surface} />
      {ready ? (
        <>
          <ProviderTabs active={active} onChange={setActive} />
          <ScannerScreen key={active} provider={activeProvider} />
        </>
      ) : (
        <View style={styles.loading}>
          <Text style={styles.brand}>🛡️ VPN Scanner Suite</Text>
          <ActivityIndicator
            size="large"
            color={THEME.accent}
            style={styles.spinner}
          />
          <Text style={styles.status}>{status}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: THEME.bg},
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  brand: {
    color: '#58a6ff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 24,
  },
  spinner: {marginBottom: 18},
  status: {color: THEME.muted, fontSize: 13, textAlign: 'center'},
});

export default App;
