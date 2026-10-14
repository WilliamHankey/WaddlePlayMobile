import React from 'react';
import { View } from 'react-native';
import type { Preview } from '@storybook/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const preview: Preview = {
  decorators: [
    (Story) => (
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, left: 0, right: 0, bottom: 34 },
        }}>
        <View style={{ flex: 1, backgroundColor: '#FCFCFC', padding: 16 }}>
          <Story />
        </View>
      </SafeAreaProvider>
    ),
  ],
  parameters: {
    backgrounds: {
      default: 'surface',
      values: [
        { name: 'surface', value: '#FCFCFC' },
        { name: 'surfaceTertiary', value: '#EDF3EF' },
        { name: 'inverse', value: '#183044' },
      ],
    },
  },
};

export default preview;
