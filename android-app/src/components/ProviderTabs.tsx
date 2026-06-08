import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {PROVIDERS, ProviderId, THEME} from '../providers';

interface Props {
  active: ProviderId;
  onChange: (id: ProviderId) => void;
}

function ProviderTabs({active, onChange}: Props): React.JSX.Element {
  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}>
        {PROVIDERS.map(p => {
          const isActive = p.id === active;
          return (
            <TouchableOpacity
              key={p.id}
              activeOpacity={0.8}
              onPress={() => onChange(p.id)}
              style={[
                styles.tab,
                isActive && {
                  backgroundColor: p.color + '22',
                  borderColor: p.color,
                },
              ]}>
              <Text style={styles.emoji}>{p.emoji}</Text>
              <Text
                style={[
                  styles.label,
                  isActive && {color: THEME.text, fontWeight: '700'},
                ]}>
                {p.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: THEME.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  row: {paddingHorizontal: 8, paddingVertical: 8, gap: 6},
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: THEME.surface2,
  },
  emoji: {fontSize: 15},
  label: {color: THEME.muted, fontSize: 13},
});

export default ProviderTabs;
