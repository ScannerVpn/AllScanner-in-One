/**
 * VPN Scanner Suite — اپ اندروید
 *
 * یک پروسه‌ی Node واقعی (nodejs-mobile، با OpenSSL) داخل اپ اجرا می‌شود که
 * هر ۸ اسکنر و سرور پوسته را بالا می‌آورد؛ سپس WebView صفحه‌ی پوسته را از
 * localhost نشان می‌دهد. منطق پروب همان کد دسکتاپ است، پس پشت DPI درست کار
 * می‌کند (برخلاف TLS نیتیو اندروید که BoringSSL است).
 */
import React, {useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {WebView} from 'react-native-webview';
import nodejs from 'nodejs-mobile-react-native';

function App(): React.JSX.Element {
  const [shellUrl, setShellUrl] = useState<string | null>(null);
  const [status, setStatus] = useState('در حال راه‌اندازی موتور اسکنر…');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;

    nodejs.start('main.js', {redirectOutputToLogcat: true});

    // پیام‌های ساده‌ی متنی برای نمایش وضعیت روی صفحه‌ی لودینگ.
    const onMessage = (msg: string) => {
      if (typeof msg === 'string' && msg.length < 80) {
        setStatus(msg);
      }
    };
    // وقتی سرور پوسته آماده شد، پورتش را می‌گیریم و WebView را بارگذاری می‌کنیم.
    const onShellReady = (payload: {port: number}) => {
      setShellUrl(`http://localhost:${payload.port}/`);
    };

    nodejs.channel.addListener('message', onMessage);
    nodejs.channel.addListener('shell-ready', onShellReady);

    return () => {
      nodejs.channel.removeListener('message', onMessage);
      nodejs.channel.removeListener('shell-ready', onShellReady);
    };
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0d1117" />
      {shellUrl ? (
        <WebView
          source={{uri: shellUrl}}
          style={styles.web}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          mixedContentMode="always"
          setSupportMultipleWindows={false}
          allowsInlineMediaPlayback
        />
      ) : (
        <View style={styles.loading}>
          <Text style={styles.brand}>🛡️ VPN Scanner Suite</Text>
          <ActivityIndicator size="large" color="#2f81f7" style={styles.spinner} />
          <Text style={styles.status}>{status}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#0d1117'},
  web: {flex: 1, backgroundColor: '#0d1117'},
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#0d1117',
  },
  brand: {color: '#58a6ff', fontSize: 20, fontWeight: '700', marginBottom: 24},
  spinner: {marginBottom: 18},
  status: {color: '#8b949e', fontSize: 13, textAlign: 'center'},
});

export default App;
