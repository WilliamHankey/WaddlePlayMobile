import type { StorybookConfig } from '@storybook/react-native-web-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  framework: {
    name: '@storybook/react-native-web-vite',
    options: {},
  },
  async viteFinal(config) {
    const alias = config.resolve?.alias;
    const aliases = Array.isArray(alias)
      ? [...alias]
      : Object.entries(alias ?? {}).map(([find, replacement]) => ({ find, replacement }));

    // The default entry of the icon set is ESM but calls require() for its
    // font asset, which is not available under Vite. The /static entry imports
    // the glyph map directly, so it works on the web.
    aliases.push({
      find: /^@react-native-vector-icons\/feather$/,
      replacement: '@react-native-vector-icons/feather/static',
    });

    config.resolve = { ...config.resolve, alias: aliases };
    return config;
  },
};

export default config;
