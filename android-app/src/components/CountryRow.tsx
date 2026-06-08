import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {CountryGroup} from '../api';
import {THEME} from '../providers';

interface Props {
  group: CountryGroup;
  expanded: boolean;
  okCount: number;
  onToggle: () => void;
  onScan: () => void;
}

function CountryRowBase({
  group,
  expanded,
  okCount,
  onToggle,
  onScan,
}: Props): React.JSX.Element {
  return (
    <View style={styles.row}>
      <TouchableOpacity style={styles.left} activeOpacity={0.7} onPress={onToggle}>
        <Text style={styles.caret}>{expanded ? '▾' : '▸'}</Text>
        <Text style={styles.flag}>{group.flag}</Text>
        <Text style={styles.country} numberOfLines={1}>
          {group.country}
        </Text>
        <View style={styles.countPill}>
          <Text style={styles.countText}>{group.servers.length}</Text>
        </View>
        {okCount > 0 ? (
          <View style={styles.okPill}>
            <Text style={styles.okText}>✓ {okCount}</Text>
          </View>
        ) : null}
      </TouchableOpacity>
      <TouchableOpacity style={styles.scanBtn} activeOpacity={0.7} onPress={onScan}>
        <Text style={styles.scanText}>📡</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface2,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 10,
    marginHorizontal: 12,
    marginBottom: 8,
    paddingRight: 6,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    minWidth: 0,
  },
  caret: {color: THEME.muted, fontSize: 13, width: 14},
  flag: {fontSize: 20},
  country: {flex: 1, color: THEME.text, fontSize: 15, fontWeight: '600'},
  countPill: {
    backgroundColor: THEME.bg,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 2,
  },
  countText: {color: THEME.muted, fontSize: 12, fontWeight: '600'},
  okPill: {
    backgroundColor: '#102017',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  okText: {color: THEME.green, fontSize: 12, fontWeight: '700'},
  scanBtn: {padding: 10},
  scanText: {fontSize: 16},
});

export default React.memo(CountryRowBase, (a, b) => {
  return (
    a.group.code === b.group.code &&
    a.expanded === b.expanded &&
    a.okCount === b.okCount &&
    a.group.servers.length === b.group.servers.length
  );
});
