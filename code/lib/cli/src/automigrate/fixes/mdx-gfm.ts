import type { Preset } from '@storybook/types';
import { dedent } from 'ts-dedent';
import semver from 'semver';
import { getStorybookData, updateMainConfig } from '../helpers/mainConfigFile';
import type { Fix } from '../types';

const logger = console;

interface Options {
  value?: boolean;
}

/**
 */
export const mdxgfm: Fix<Options> = {
  id: 'gfm',

  async check({ configDir, packageManager }) {
    const { mainConfig, storybookVersion } = await getStorybookData({ packageManager, configDir });

    if (!semver.gte(storybookVersion, '7.0.0')) {
      return null;
    }

    const usesMDX1 = mainConfig?.features?.legacyMdx1 === true || false;
    const skip =
      usesMDX1 ||
      !!mainConfig.addons?.find((item) => {
        if (item === '@storybook/addon-gfm') {
          return true;
        }
        if (typeof item === 'string') {
          return false;
        }
        if (item.name === '@storybook/addon-docs') {
          return item.options?.mdxPluginOptions?.mdxCompileOptions?.remarkPlugins?.length > 0;
        }
        return false;
      });

    if (skip) {
      return null;
    }

    return {};
  },

  prompt() {
    return dedent`
      In MDX1 you had the option of using GitHub formatted markdown.

      Storybook 7.0 uses MDX2 for compiling MDX, and thus no longer supports GFM out of the box.
      Because of this you need to explicitly add the GFM plugin in the addon-docs options:
      https://storybook.js.org/docs/7.0/react/writing-docs/mdx#lack-of-github-flavored-markdown-gfm

      We recommend you follow the guide on the link above, however we can add a temporary storybook addon that helps make this migration easier.
      We'll install the addon and add it to your storybook config.
    `;
  },

  async run({ packageManager, dryRun, mainConfigPath, skipInstall }) {
    if (!dryRun) {
      if (!skipInstall) {
        await packageManager.addDependencies({ installAsDevDependencies: true }, [
          '@storybook/addon-gfm',
        ]);
      }

      await updateMainConfig({ mainConfigPath, dryRun }, async (main) => {
        const addonsToAdd = ['@storybook/addon-gfm'];

        const existingAddons = main.getFieldValue(['addons']) as Preset[];
        const updatedAddons = [...existingAddons, ...addonsToAdd];
        logger.info(`✅ Adding addon`);
        if (!dryRun) {
          main.setFieldValue(['addons'], updatedAddons);
        }
      });
    }
  },
};
