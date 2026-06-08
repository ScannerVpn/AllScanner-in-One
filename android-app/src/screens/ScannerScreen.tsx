import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {
  CountryGroup,
  fetchLive,
  getBundled,
  groupByCountry,
  pingHost,
  PingResult,
  Server,
} from '../api';
import {Provider, THEME} from '../providers';
import ServerCard from '../components/ServerCard';
import CountryRow from '../components/CountryRow';

interface Props {
  provider: Provider;
}

type Row =
  | {type: 'country'; group: CountryGroup}
  | {type: 'server'; server: Server};

const CONCURRENCY = 8;

function ScannerScreen({provider}: Props): React.JSX.Element {
  const [servers, setServers] = useState<Server[]>(() => getBundled(provider.id));
  const [results, setResults] = useState<Record<string, PingResult>>({});
  const [pinging, setPinging] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState('');
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState('');
  const stopRef = useRef(false);

  useEffect(() => {
    setServers(getBundled(provider.id));
    setResults({});
    setPinging({});
    setExpanded(new Set());
    setQuery('');
    let alive = true;
    fetchLive(provider).then(live => {
      if (alive && live && live.length > getBundled(provider.id).length) {
        setServers(live);
      }
    });
    return () => {
      alive = false;
      stopRef.current = true;
    };
  }, [provider]);

  // گروه‌بندی کشوری + فیلتر سرچ (روی نام کشور/کد).
  const groups = useMemo(() => {
    const all = groupByCountry(servers);
    const q = query.trim().toLowerCase();
    if (!q) {
      return all;
    }
    return all.filter(
      g =>
        g.country.toLowerCase().includes(q) || g.code.toLowerCase().includes(q),
    );
  }, [servers, query]);

  // ساخت آرایه‌ی تخت برای FlatList: هدر کشور + (در صورت باز بودن) سرورهایش.
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    for (const g of groups) {
      out.push({type: 'country', group: g});
      if (expanded.has(g.code)) {
        for (const s of g.servers) {
          out.push({type: 'server', server: s});
        }
      }
    }
    return out;
  }, [groups, expanded]);

  const stats = useMemo(() => {
    const vals = Object.values(results);
    return {
      total: servers.length,
      ok: vals.filter(v => v.state === 'ok').length,
      countries: groups.length,
    };
  }, [servers, results, groups]);

  const okPerCountry = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of servers) {
      if (results[s.hostname]?.state === 'ok') {
        m[s.code] = (m[s.code] || 0) + 1;
      }
    }
    return m;
  }, [servers, results]);

  const toggle = useCallback((code: string) => {
    setExpanded(prev => {
      const n = new Set(prev);
      if (n.has(code)) {
        n.delete(code);
      } else {
        n.add(code);
      }
      return n;
    });
  }, []);

  const pingOne = useCallback(
    async (s: Server) => {
      setPinging(p => ({...p, [s.hostname]: true}));
      const target = s.ip || s.hostname;
      const r = await pingHost(provider.port, target);
      setResults(prev => ({...prev, [s.hostname]: r}));
      setPinging(p => {
        const n = {...p};
        delete n[s.hostname];
        return n;
      });
      return r;
    },
    [provider.port],
  );

  const scanList = useCallback(
    async (list: Server[]) => {
      if (scanning) {
        stopRef.current = true;
        return;
      }
      stopRef.current = false;
      setScanning(true);
      const queue = [...list];
      const total = queue.length;
      let done = 0;
      const worker = async () => {
        while (queue.length && !stopRef.current) {
          const s = queue.shift()!;
          try {
            await pingOne(s);
          } catch {}
          done += 1;
          setProgress(`${done}/${total}`);
        }
      };
      await Promise.all(Array.from({length: Math.min(CONCURRENCY, total)}, worker));
      setScanning(false);
      setProgress('');
    },
    [scanning, pingOne],
  );

  // اسکن یک کشور: اگر بسته بود بازش کن، بعد همه‌ی سرورهایش را اسکن کن.
  const scanCountry = useCallback(
    (g: CountryGroup) => {
      setExpanded(prev => new Set(prev).add(g.code));
      scanList(g.servers);
    },
    [scanList],
  );

  const scanAllVisible = useCallback(() => {
    const list = groups.flatMap(g => g.servers);
    scanList(list);
  }, [groups, scanList]);

  const renderItem = useCallback(
    ({item}: {item: Row}) => {
      if (item.type === 'country') {
        return (
          <CountryRow
            group={item.group}
            expanded={expanded.has(item.group.code)}
            okCount={okPerCountry[item.group.code] || 0}
            onToggle={() => toggle(item.group.code)}
            onScan={() => scanCountry(item.group)}
          />
        );
      }
      return (
        <ServerCard
          server={item.server}
          result={results[item.server.hostname]}
          pinging={!!pinging[item.server.hostname]}
          onPress={() => pingOne(item.server)}
        />
      );
    },
    [expanded, okPerCountry, results, pinging, toggle, scanCountry, pingOne],
  );

  const keyExtractor = useCallback(
    (item: Row) =>
      item.type === 'country' ? 'c:' + item.group.code : 's:' + item.server.hostname,
    [],
  );

  return (
    <View style={styles.root}>
      <View style={styles.stats}>
        <Stat label="کشورها" value={stats.countries} color={THEME.text} />
        <Stat label="کل سرور" value={stats.total} color={THEME.text} />
        <Stat label="✓ باز" value={stats.ok} color={THEME.green} />
      </View>

      <TextInput
        style={styles.search}
        placeholder="🔍 جستجوی کشور…"
        placeholderTextColor={THEME.muted}
        value={query}
        onChangeText={setQuery}
      />

      <FlatList
        data={rows}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        initialNumToRender={15}
        maxToRenderPerBatch={15}
        windowSize={10}
        removeClippedSubviews
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<Text style={styles.empty}>کشوری پیدا نشد</Text>}
      />

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={scanAllVisible}
        style={[styles.scanBtn, scanning && styles.scanBtnStop]}>
        <Text style={styles.scanBtnText}>
          {scanning ? `⛔ توقف  ${progress}` : '📡 اسکن همه'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function Stat({label, value, color}: {label: string; value: number; color: string}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statVal, {color}]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: THEME.bg},
  stats: {flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 10},
  stat: {
    flex: 1,
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  statLabel: {color: THEME.muted, fontSize: 10},
  statVal: {fontSize: 18, fontWeight: '700', marginTop: 2},
  search: {
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 10,
    color: THEME.text,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginHorizontal: 12,
    marginTop: 10,
    fontSize: 13,
    textAlign: 'right',
  },
  listContent: {paddingTop: 10, paddingBottom: 90},
  empty: {color: THEME.muted, textAlign: 'center', marginTop: 40, fontSize: 13},
  scanBtn: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: THEME.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    elevation: 6,
  },
  scanBtnStop: {backgroundColor: '#b3261e'},
  scanBtnText: {color: '#fff', fontSize: 15, fontWeight: '700'},
});

export default ScannerScreen;
