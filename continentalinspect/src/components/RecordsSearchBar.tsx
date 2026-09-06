import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TextInput, View } from 'react-native';

import { useTheme } from '@/context/ThemeContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { AppColors } from '@/theme/palettes';

type RecordsSearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
};

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.background.secondary,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border.default,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 16,
    },
    input: {
      flex: 1,
      fontSize: 15,
      color: colors.text.primary,
      paddingVertical: 0,
    },
  });
}

export function RecordsSearchBar({
  value,
  onChangeText,
  placeholder = 'Search by ULD serial or AWB...',
}: RecordsSearchBarProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <Ionicons name="search" size={20} color={colors.text.secondary} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.text.secondary}
        autoCapitalize="characters"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
    </View>
  );
}
