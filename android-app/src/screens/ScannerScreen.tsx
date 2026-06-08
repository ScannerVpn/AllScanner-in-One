import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {fetchLive, getBundled, pingHost, PingResult, PingState, Server} from '../api';
import {Provider, THEME} from '../providers';
import ServerCard from '../components/ServerCard';

interface Props {
  provider: Provider;
}

type FilterMode = 'all' | 'ok' | 'dpi' | 'bad' | 'unscanned';

const FILTERS: {key: FilterMode; label: string}[] = [
  {key: 'all', label: 'همه'},
  {key: 'ok', label: '✓ باز'},
  {key: 'dpi', label: '⚠ DPI'},
  {key: 'bad', label: '✕ بسته'},
  {key: 'unscanned', label: 'اسکن‌نشده'},
];

const CONCURRENCY = 8;

function ScannerScreen({provider}: Props): React.JSX.Element {
  const [servers, setServers] = useState<Server[]>(() => getBundled(provider.id));
  const [results, setResults] = useState<Record<string, PingResult>>({});
  const [pinging, setPinging] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState('');
  const stopRef = useRef(false);

  // هنگام تغییر ارائه‌دهنده: لیست باندل‌شده فوری؛ سپس تلاش برای آپدیت لایو.
  useEffect(() => {
    setServers(getBundled(provider.id));
    setResults({});
    setPinging({});
    setQuery('');
    setFilter('all');
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return servers.filter(s => {
      if (q) {
        const hay = (s.country + ' ' + s.city + ' ' + s.code).toLowerCase();
        if (!hay.includes(q)) {
          return false;
        }
      }
      if (filter === 'all') {
        return true;
      }
      const st = results[s.hostname]?.state;
      if (filter === 'unscanned') {
        return !st;
      }
      return st === filter;
    });
  }, [servers, query, filter, results]);

  const stats = useMemo(() => {
    const vals = Object.values(results);
    return {
      total: servers.length,
      ok: vals.filter(v => v.state === 'ok').length,
      dpi: vals.filter(v => v.state === 'dpi').length,
      bad: vals.filter(v => v.state === 'bad').length,
    };
  }, [servers, results]);

  const pingOne = useCallback(
    async (s: Server) => {
      setPinging(p => ({...p, [s.hostname]: true}));
      // برای nord از station IP استفاده می‌کنیم اگر موجود بود.
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

  const scanAll = useCallback(async () => {
    if (scanning) {
      stopRef.current = true;
      return;
    }
    stopRef.current = false;
    setScanning(true);
    const queue = [...filtered];
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
    await Promise.all(
      Array.from({length: Math.min(CONCURRENCY, total)}, worker),
    );
    setScanning(false);
    setProgress('');
  }, [scanning, filtered, pingOne]);

  const renderItem = useCallback(
    ({item}: {item: Server}) => (
      <ServerCard
        server={item}
        result={results[item.hostname]}
        pinging={!!pinging[item.hostname]}
        onPress={() => pingOne(item)}
      />
    ),
    [results, pinging, pingOne],
  );

  return (
    <View style={styles.root}>
      {/* آمار */}
      <View style={styles.stats}>
        <Stat label="کل" value={stats.total} color={THEME.text} />
        <Stat label="✓ باز" value={stats.ok} color={THEME.green} />
        <Stat label="⚠ DPI" value={stats.dpi} color={THEME.yellow} />
        <Stat label="✕ بسته" value={stats.bad} color={THEME.red} />
      </View>

      {/* سرچ */}
      <TextInput
        style={styles.search}
        placeholder="🔍 فیلتر بر اساس کشور / شهر…"
        placeholderTextColor={THEME.muted}
        value={query}
        onChangeText={setQuery}
      />

      {/* چیپ‌های فیلتر */}
      <View style={styles.chips}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[styles.chip, filter === f.key && styles.chipActive]}>
            <Text
              style={[
                styles.chipText,
                filter === f.key && styles.chipTextActive,
              ]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* لیست */}
      <FlatList
        data={filtered}
        keyExtractor={s => s.hostname}
        renderItem={renderItem}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={9}
        removeClippedSubviews
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Text style={styles.empty}>سروری برای نمایش نیست</Text>
        }
      />

      {/* دکمه‌ی شناور اسکن همه */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={scanAll}
        style={[styles.scanBtn, scanning && styles.scanBtnStop]}>
        <Text style={styles.scanBtnText}>
          {scanning ? `⛔ توقف  ${progress}` : '📡 اسکن همه'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statVal, {color}]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: THEME.bg},
  stats: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: THEME.surface,
  },
  chipActive: {backgroundColor: THEME.accent, borderColor: THEME.accent},
  chipText: {color: THEME.muted, fontSize: 12},
  chipTextActive: {color: '#fff', fontWeight: '700'},
  listContent: {paddingTop: 8, paddingBottom: 90},
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
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
    elevation: 6,
  },
  scanBtnStop: {backgroundColor: '#b3261e'},
  scanBtnText: {color: '#fff', fontSize: 15, fontWeight: '700'},
});

export default ScannerScreen;
