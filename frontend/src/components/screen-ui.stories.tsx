import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { ActionButton, EmptyState, Notice, Sheet, SkeletonCards } from './screen-ui';

const meta: Meta = {
  title: 'Components/Screen UI',
};

export default meta;

type Story = StoryObj;

export const ActionButtons: Story = {
  render: () => (
    <View>
      <ActionButton label="Primary action" onPress={() => {}} />
      <ActionButton label="Secondary action" secondary onPress={() => {}} />
      <ActionButton label="Destructive action" danger onPress={() => {}} />
      <ActionButton label="Loading" loading onPress={() => {}} />
      <ActionButton label="Disabled" disabled onPress={() => {}} />
    </View>
  ),
};

export const Empty: Story = {
  render: () => (
    <EmptyState
      icon="search"
      title="No playdates yet"
      description="When you connect with a verified family, your playdates will show up here."
      action="Find families"
      onAction={() => {}}
      secondary="Invite a friend"
      onSecondary={() => {}}
    />
  ),
};

export const Notices: Story = {
  render: () => (
    <View>
      <Notice>Your family profile is verified.</Notice>
      <Notice error>We could not reach the server. Please try again.</Notice>
    </View>
  ),
};

export const Skeleton: Story = {
  render: () => <SkeletonCards />,
};

export const BottomSheet: Story = {
  render: () => (
    <Sheet visible title="Share playdate" description="Invite another family to join." onClose={() => {}}>
      <ActionButton label="Copy link" onPress={() => {}} />
      <ActionButton label="Cancel" secondary onPress={() => {}} />
    </Sheet>
  ),
};
