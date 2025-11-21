import { describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG } from './config.js';
import { coreRuleRegistry } from './rules/core.js';
import { createRegistry, defineRule, evaluateRules } from './rules/index.js';
import type { BranchConfig } from './types.js';
import { getTicketIdRule, lintBranchName, normalizeRuleConfig } from './utils.js';
import { BranchValidator } from './validator.js';

describe('Rules System', () => {
  describe('normalizeRuleConfig', () => {
    it('should handle boolean values', () => {
      expect(normalizeRuleConfig(true)).toEqual({
        severity: 'required',
      });

      expect(normalizeRuleConfig(false)).toEqual({
        severity: 'off',
      });
    });

    it('should handle string values', () => {
      expect(normalizeRuleConfig('required')).toEqual({
        severity: 'required',
      });

      expect(normalizeRuleConfig('optional')).toEqual({
        severity: 'optional',
      });

      expect(normalizeRuleConfig('off')).toEqual({
        severity: 'off',
      });
    });

    it('should handle array format', () => {
      expect(normalizeRuleConfig(['optional', { prefix: 'PROJ-' }])).toEqual({
        severity: 'optional',
        options: { prefix: 'PROJ-' },
      });

      expect(normalizeRuleConfig(['required', undefined])).toEqual({
        severity: 'required',
      });
    });

    it('should handle object format', () => {
      const config = {
        severity: 'required' as const,
        options: { prefix: 'TEST-' },
      };

      expect(normalizeRuleConfig(config)).toEqual(config);
    });
  });

  describe('getTicketIdRule', () => {
    it('should use rules.ticketId when available', () => {
      const config: BranchConfig = {
        branchTypes: [{ name: 'feat', label: 'Feature' }],
        maxDescriptionLength: 30,
        ignoredBranches: [],
        descriptionStyle: 'kebab-case',
        rules: {
          ticketId: ['required', { prefix: 'PROJ-' }],
        },
      };

      const result = getTicketIdRule(config);
      expect(result).toEqual({
        severity: 'required',
        options: { prefix: 'PROJ-' },
      });
    });

    it('should fallback to legacy config when rules.ticketId is not set', () => {
      const config: BranchConfig = {
        branchTypes: [{ name: 'feat', label: 'Feature' }],
        maxDescriptionLength: 30,
        ignoredBranches: [],
        descriptionStyle: 'kebab-case',
        ticketIdPrompt: 'required',
        ticketIdPrefix: 'LEGACY-',
      };

      const result = getTicketIdRule(config);
      expect(result).toEqual({
        severity: 'required',
        options: { prefix: 'LEGACY-' },
      });
    });

    it('should convert skip to off for legacy config', () => {
      const config: BranchConfig = {
        branchTypes: [{ name: 'feat', label: 'Feature' }],
        maxDescriptionLength: 30,
        ignoredBranches: [],
        descriptionStyle: 'kebab-case',
        ticketIdPrompt: 'skip',
      };

      const result = getTicketIdRule(config);
      expect(result).toEqual({
        severity: 'off',
      });
    });

    it('should handle boolean rules', () => {
      const config: BranchConfig = {
        branchTypes: [{ name: 'feat', label: 'Feature' }],
        maxDescriptionLength: 30,
        ignoredBranches: [],
        descriptionStyle: 'kebab-case',
        rules: {
          ticketId: true,
        },
      };

      const result = getTicketIdRule(config);
      expect(result).toEqual({
        severity: 'required',
      });
    });
  });

  describe('evaluateRules', () => {
    it('should return no violations for a valid branch', async () => {
      const violations = await evaluateRules('feat/new-feature', DEFAULT_CONFIG, coreRuleRegistry);
      expect(violations).toHaveLength(0);
    });

    it('should detect violations for invalid branches', async () => {
      const violations = await evaluateRules('unknown/Bad_Style', DEFAULT_CONFIG, coreRuleRegistry);
      expect(violations.some((violation) => violation.ruleId === 'branchType')).toBe(true);
      expect(violations.some((violation) => violation.ruleId === 'descriptionStyle')).toBe(true);
    });
  });

  describe('lintBranchName', () => {
    it('should resolve with violations metadata', async () => {
      const result = await lintBranchName('foo/BadName', DEFAULT_CONFIG);
      expect(result.isValid).toBe(false);
      expect(result.violations?.length).toBeGreaterThan(0);
      expect(result.errors).toEqual(result.violations?.map((violation) => violation.message));
    });
  });

  describe('guardrails', () => {
    it('rejects non-serializable rule options', async () => {
      const unsafeRule = defineRule(
        {
          id: 'unsafe',
          meta: { title: 'Unsafe', description: 'Should never run.' },
          defaultSeverity: 'required',
          defaultOptions: { handler: () => null },
        },
        () => null,
      );

      const registry = createRegistry(unsafeRule);

      await expect(evaluateRules('feat/test', DEFAULT_CONFIG, registry)).rejects.toThrow(
        /Rule options.*JSON-serializable/,
      );
    });
  });

  describe('extensions', () => {
    const baseConfig: BranchConfig = {
      ...DEFAULT_CONFIG,
      branchTypes: [...DEFAULT_CONFIG.branchTypes],
      ignoredBranches: [...DEFAULT_CONFIG.ignoredBranches],
      plugins: [],
      presets: [],
      rules: { ...DEFAULT_CONFIG.rules },
    };

    it('loads plugins from configuration references', async () => {
      const config: BranchConfig = {
        ...baseConfig,
        plugins: ['./src/__tests__/fixtures/no-wip-plugin.ts'],
      };

      const validator = new BranchValidator(config, { cwd: process.cwd() });
      const result = await validator.validate('feat/add-new-wip-feature');

      expect(result.valid).toBe(false);
      expect(result.message).toContain('wip');
    });

    it('merges presets in order while allowing rule overrides', async () => {
      const config: BranchConfig = {
        ...baseConfig,
        presets: ['./src/__tests__/fixtures/lenient-preset.ts', './src/__tests__/fixtures/strict-preset.ts'],
        rules: {
          ...baseConfig.rules,
          descriptionLength: 'off',
        },
      };

      const validator = new BranchValidator(config, { cwd: process.cwd() });
      const longDescription = 'feat/this-description-is-way-too-long-for-the-default-limit';

      const result = await validator.validate(longDescription);
      expect(result.valid).toBe(true);

      const effectiveConfig = validator.getConfig();
      expect(effectiveConfig.rules?.descriptionLength).toBe('off');
      expect(effectiveConfig.rules?.ticketId).toEqual(['required', { prefix: 'ABC-' }]);
    });
  });
});
