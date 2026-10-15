import React from 'react';
import { View } from 'react-native';
import type { Preview } from '@storybook/react-native-web-vite';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import featherFontUrl from '@react-native-vector-icons/feather/fonts/Feather.ttf';

if (typeof document !== 'undefined' && typeof FontFace !== 'undefined') {
  const featherFace = new FontFace('Feather', `url(${featherFontUrl})`);
  document.fonts.add(featherFace);
  featherFace.load().catch(() => undefined);
}

const preview: Preview = {
  decorators: [
    (Story) => (
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <View style={{ flex: 1, backgroundColor: '#FCFCFC', padding: 16 }}>
          <Story />
        </View>
      </SafeAreaProvider>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
