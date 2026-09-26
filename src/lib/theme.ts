import { Platform, StyleSheet } from 'react-native';

import type { Rank } from './game';

export const palette = {
  bg: '#080B14',
  bgElevated: '#0E1526',
  panel: '#121B2E',
  panelSoft: '#182339',
  border: '#243050',
  borderSoft: '#1B2540',
  text: '#E9EEFA',
  textMuted: '#94A3C0',
  textFaint: '#5F6E90',
  gold: '#F2C14E',
  goldDeep: '#8A6A1F',
  goldWash: '#2A2312',
  green: '#4ADE80',
  greenWash: '#12301F',
  red: '#F87171',
  redWash: '#331A20',
  blue: '#60A5FA',
  blueWash: '#14263F',
  purple: '#A78BFA',
  purpleWash: '#241E3F',
  orange: '#FB923C',
  slate: '#94A3B8',
  slateWash: '#1B2334',
  onGold: '#1A1204',
} as const;

export const rankColors: Record<Rank, { fg: string; bg: string }> = {
  D: { fg: palette.slate, bg: palette.slateWash },
  C: { fg: palette.green, bg: palette.greenWash },
  B: { fg: palette.blue, bg: palette.blueWash },
  A: { fg: palette.purple, bg: palette.purpleWash },
  S: { fg: palette.gold, bg: palette.goldWash },
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 22, xxl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

export const mono = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'ui-monospace, SFMono-Regular, Menlo, monospace',
});

export const text = StyleSheet.create({
  h1: { fontSize: 26, fontWeight: '800', color: palette.text, letterSpacing: 0.2 },
  h2: { fontSize: 19, fontWeight: '700', color: palette.text },
  h3: { fontSize: 16, fontWeight: '700', color: palette.text },
  body: { fontSize: 15, color: palette.text, lineHeight: 21 },
  muted: { fontSize: 13, color: palette.textMuted, lineHeight: 19 },
  faint: { fontSize: 12, color: palette.textFaint },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.8,
    color: palette.textMuted,
    textTransform: 'uppercase',
  },
  stat: { fontSize: 24, fontWeight: '800', color: palette.text, fontVariant: ['tabular-nums'] },
  mono: { fontFamily: mono, fontSize: 13, color: palette.textMuted },
});
