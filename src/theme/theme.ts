import { Platform } from 'react-native';

/** Shared UI tokens. Gameplay/world colors intentionally stay independent. */
export const theme = {
  colors: {
    blue: '#246BFD', blueShadow: '#1646B3', paleBlue: '#EAF3FF',
    orange: '#FF8A3D', orangeShadow: '#B64E20', teal: '#2EC4B6', tealShadow: '#16877E',
    purple: '#7C4DFF', purpleShadow: '#4C2AB5', green: '#58CC02', greenShadow: '#329500',
    red: '#FF4B4B', night: '#101E38', sky: '#294B7D', sunset: '#B86F79',
    panel: '#20365B', outline: '#3E5C86', ink: '#17243D', cream: '#FFF4DC',
    text: '#FFFFFF', muted: '#BAC8E5', gold: '#FFD35A', goldShadow: '#C78A20',
    scrim: '#090F28CC',
  },
  font: { regular: Platform.select({ android: 'Nunito', default: 'Arial Rounded MT Bold' }), bold: Platform.select({ android: 'Nunito-Bold', default: 'Arial Rounded MT Bold' }) },
  size: { caption: 12, body: 15, label: 17, heading: 24, title: 42 },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  radius: { button: 20, card: 24, pill: 999 },
  layout: { maxWidth: 820, gutter: 20, minTouch: 48 },
  motion: { press: 90, enter: 350, idle: 1600 },
} as const;
