import { defineRule } from '../../rules/index.js';

const noWipRule = defineRule(
  {
    id: 'no-wip',
    meta: {
      title: 'Disallow WIP branches',
      description: 'Prevents committing branches containing "wip" markers.',
    },
    defaultSeverity: 'required',
  },
  (context) => {
    if (context.branchName.toLowerCase().includes('wip')) {
      return {
        message: 'Branch names must not include "wip".',
      };
    }

    return null;
  },
);

export default [noWipRule];
