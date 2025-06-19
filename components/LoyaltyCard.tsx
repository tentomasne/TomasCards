import {
  TouchableOpacity,
  Text,
  Image,
  StyleSheet,
  ImageSourcePropType,
} from 'react-native';
import type { LoyaltyCard } from '@/utils/types';
import { useTheme } from '@/hooks/useTheme';
import { POPULAR_CARDS } from '@/assets/cards';

type Props = {
  card: LoyaltyCard;
  onPress: () => void;
};

export default function LoyaltyCardComponent({ card, onPress }: Props) {
  const { colors } = useTheme();
  
  const matchedCard = POPULAR_CARDS.find(
    (item) => item.id?.toLowerCase() === card.brand?.toLowerCase()
  );

  const logoSource: ImageSourcePropType | null = matchedCard
    ? (matchedCard.logo as ImageSourcePropType)
    : null;

  // Ensure card name exists and has at least one character
  const cardName = card.name || 'Unknown Card';
  const firstLetter = cardName.charAt(0).toUpperCase() || '?';

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: card.color || colors.accent }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {logoSource ? (
        <Image
          source={logoSource}
          style={styles.logo}
          resizeMode="contain"
        />
      ) : (
        <Text style={[styles.letter, { color: colors.textPrimary }]}>
          {firstLetter}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: 8,
    height: 120,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 64,
    height: 64,
  },
  letter: {
    fontSize: 32,
    fontWeight: '700',
  },
});