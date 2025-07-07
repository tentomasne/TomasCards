import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { POPULAR_CARDS } from '@/assets/cards';
import Header from '@/components/Header';

export default function AddCardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const [query, setQuery] = useState('');

  const filtered = POPULAR_CARDS.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  const popularCards = filtered.filter((c) => c.popular);
  const unPopularCards = filtered.filter((c) => !c.popular);

  const handleSelect = (storeId: string) => {
    router.push({ pathname: '/add/scan', params: { store: storeId } });
  };

  const handleCreateCustom = () => {
    router.push('/add/custom');
  };

  // Create sections data for the FlatList - only show sections if there are results
  const sections = [
    {
      id: 'custom',
      type: 'custom',
      data: null,
    },
    ...(popularCards.length > 0 ? [{
      id: 'popular-header',
      type: 'header',
      title: t('addCard.popularStores'),
      data: null,
    }] : []),
    ...popularCards.map(card => ({
      id: card.id,
      type: 'card',
      data: card,
    })),
    ...(unPopularCards.length > 0 ? [{
      id: 'other-header',
      type: 'header',
      title: t('addCard.otherStores'),
      data: null,
    }] : []),
    ...unPopularCards.map(card => ({
      id: card.id,
      type: 'card',
      data: card,
    })),
  ];

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    switch (item.type) {
      case 'custom':
        return (
          <TouchableOpacity
            style={[styles.customCardOption, { backgroundColor: colors.backgroundMedium }]}
            onPress={handleCreateCustom}
          >
            <View style={[styles.customCardIcon, { backgroundColor: colors.accent }]}>
              <Plus size={24} color={colors.textPrimary} />
            </View>
            <View style={styles.customCardText}>
              <Text style={[styles.customCardTitle, { color: colors.textPrimary }]}>
                {t('addCard.custom.createCustom')}
              </Text>
              <Text style={[styles.customCardDescription, { color: colors.textSecondary }]}>
                {t('addCard.custom.createCustomDescription')}
              </Text>
            </View>
          </TouchableOpacity>
        );

      case 'header':
        return (
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {item.title}
          </Text>
        );

      case 'card':
        return (
          <TouchableOpacity
            style={styles.itemRow}
            onPress={() => handleSelect(item.data.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.logoContainer, { backgroundColor: item.data.color }]}>
              <Image source={item.data.logo} style={styles.logo} />
            </View>
            <Text style={[styles.itemText, { color: colors.textPrimary }]}>
              {item.data.name}
            </Text>
          </TouchableOpacity>
        );

      default:
        return null;
    }
  };

  const renderSeparator = () => {
    return <View style={[styles.separator, { backgroundColor: colors.backgroundMedium }]} />;
  };

  const getItemLayout = (data: any, index: number) => {
    // Approximate heights for performance
    const ITEM_HEIGHT = 60;
    const HEADER_HEIGHT = 50;
    const CUSTOM_HEIGHT = 80;
    
    let height = ITEM_HEIGHT;
    if (data && data[index]) {
      switch (data[index].type) {
        case 'custom':
          height = CUSTOM_HEIGHT;
          break;
        case 'header':
          height = HEADER_HEIGHT;
          break;
        default:
          height = ITEM_HEIGHT;
      }
    }
    
    return {
      length: height,
      offset: height * index,
      index,
    };
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundDark }]}>
      <Header title={t('addCard.title')} showBack={true} />

      <TextInput
        style={[styles.searchInput, { 
          backgroundColor: colors.backgroundMedium,
          color: colors.textPrimary 
        }]}
        placeholder={t('addCard.searchPlaceholder')}
        placeholderTextColor={colors.textSecondary}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        clearButtonMode="while-editing"
      />

      <FlatList
        data={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={renderSeparator}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchInput: {
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  listContent: {
    paddingBottom: Platform.OS === 'android' ? 16 : 0,
  },
  customCardOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
  },
  customCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  customCardText: {
    flex: 1,
  },
  customCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  customCardDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  logoContainer: {
    width: 56,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  logo: {
    width: 40,
    height: 24,
    resizeMode: 'contain',
  },
  itemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },
});