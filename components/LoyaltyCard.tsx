import {
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import type { LoyaltyCard } from '@/utils/types';
import { useTheme } from '@/hooks/useTheme';

type Props = {
  card: LoyaltyCard;
  onPress: () => void;
};

export default function LoyaltyCardComponent({ card, onPress }: Props) {
  const { colors } = useTheme();

  // Ensure card name exists and has at least one character
  const cardName = card.name || 'Unknown Card';

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: card.color || colors.accent }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.cardName, { color: '#FFFFFF' }]} numberOfLines={2}>
        {cardName}
      </Text>
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
    padding: 12,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
  },
});