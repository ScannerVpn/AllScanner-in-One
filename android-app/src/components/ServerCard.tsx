import React from 'react';
import {ActivityIndicator, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {PingResult, Server} from '../api';
import {THEME} from '../providers';

interface Props {
  server: Server;
  result?: PingResult;
  pinging?: boolean;
  onPress: () => void;
}

function badge(result?: PingResult, pinging?: boolean) {
  if (pinging) {
    return {label: '…', color: THEME.muted, bg: THEME.surface2};
  }
  if (!result || result.state === 'unscanned') {
    return {label: '—', color: THEME.muted, bg: THEME.surface2};
  }
  switch (result.state) {
    case 'ok':
      return {label: '✓ باز', color: THEME.green, bg: '#102017'};
    case 'dpi':
      return {label: '⚠ DPI', color: THEME.yellow, bg: '#241c10'};
    case 'dns':
      return {label: '⛔ DNS', color: THEME.muted, bg: THEME.surface2};
    default:
      return {label: '✕ بسته', color: THEME.red, bg: '#2a1416'};
  }
}

function ServerCardBase({server, result, pinging, onPress}: Props): React.JSX.Element {
  const b = badge(result, pinging);
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={styles.card}>
      <Text style={styles.flag}>{server.flag}</Text>
      <View style={styles.mid}>
        <Text style={styles.title} numberOfLines={1}>
          {server.country}
          {server.city ? ` · ${server.city}` : ''}
        </Text>
        <Text style={styles.host} numberOfLines={1}>
          {server.hostname}
        </Text>
      </View>
      <View style={styles.right}>
        <View style={[styles.badge, {backgroundColor: b.bg}]}>
          {pinging ? (
            <ActivityIndicator size="small" color={THEME.muted} />
          ) : (
            <Text style={[styles.badgeText, {color: b.color}]}>{b.label}</Text>
          )}
        </View>
        {result && result.ms != null ? (
          <Text style={styles.ms}>{result.ms} ms</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 12,
    marginBottom: 8,
    gap: 10,
  },
  flag: {fontSize: 22},
  mid: {flex: 1, minWidth: 0},
  title: {color: THEME.text, fontSize: 14, fontWeight: '600'},
  host: {color: THEME.muted, fontSize: 11, marginTop: 2},
  right: {alignItems: 'flex-end', gap: 3},
  badge: {
    minWidth: 58,
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeText: {fontSize: 12, fontWeight: '700'},
  ms: {color: THEME.muted, fontSize: 11},
});

// memo تا اسکرول روان بماند؛ فقط وقتی نتیجه/وضعیت همان کارت عوض شد رندر دوباره.
export default React.memo(ServerCardBase, (a, b) => {
  return (
    a.server.hostname === b.server.hostname &&
    a.pinging === b.pinging &&
    a.result?.state === b.result?.state &&
    a.result?.ms === b.result?.ms
  );
});
