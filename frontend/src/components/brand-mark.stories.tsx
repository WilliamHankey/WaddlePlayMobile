import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { BrandMark } from './brand-mark';

const meta = {
  title: 'Components/BrandMark',
  component: BrandMark,
  args: { scale: 1 },
  decorators: [
    (Story) => (
      <View style={{ padding: 16, alignItems: 'center', justifyContent: 'center' }}>
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof BrandMark>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Small: Story = { args: { scale: 0.6 } };

export const Large: Story = { args: { scale: 2 } };
