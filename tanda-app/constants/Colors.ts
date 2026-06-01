import { BrandColors } from './brand';

const tintColorLight = BrandColors.blue600;
const tintColorDark = BrandColors.white;

export default {
  light: {
    text: '#000',
    background: '#fff',
    tint: tintColorLight,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#fff',
    background: BrandColors.screenBg,
    tint: tintColorDark,
    tabIconDefault: '#ccc',
    tabIconSelected: BrandColors.blue500,
  },
};
