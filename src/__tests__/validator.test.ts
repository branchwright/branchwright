import { beforeEach, describe, expect, it } from 'vitest';

import { type BranchConfig } from '../types';
import { BranchValidator } from '../validator';

describe('BranchValidator', () => {
  let validator: BranchValidator;

  beforeEach(() => {
    validator = new BranchValidator();
  });

  describe('validate', () => {
    it('should validate correct branch names', () => {
      const validNames = ['feat/user-authentication', 'fix/login-error', 'chore/update-dependencies'];

      validNames.forEach((name) => {
        const result = validator.validate(name);
        expect(result.valid).toBe(true);
        expect(result.message).toBeUndefined();
      });
    });

    it('should reject invalid branch names', () => {
      const invalidNames = [
        'invalid-branch', // doesn't match pattern
        'feature/', // no description
        'feat/test_with_underscores_when_kebab_case_required', // wrong style
        'feat/this-description-is-way-too-long-for-the-default-limit', // too long
      ];

      invalidNames.forEach((name) => {
        const result = validator.validate(name);
        expect(result.valid).toBe(false);
        expect(result.message).toBeDefined();
      });
    });

    it('should enforce description length', () => {
      const config: BranchConfig = {
        branchTypes: [{ name: 'feat', label: 'Feature' }],
        maxDescriptionLength: 5,
        ticketIdPrompt: 'skip',
        ignoredBranches: [],
        descriptionStyle: 'kebab-case',
      };
      validator = new BranchValidator(config);

      const result = validator.validate('feat/very-long-description');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('exceeds maximum length');
    });

    it('should validate description style', () => {
      const config: BranchConfig = {
        branchTypes: [{ name: 'feat', label: 'Feature' }],
        maxDescriptionLength: 30,
        ticketIdPrompt: 'skip',
        ignoredBranches: [],
        descriptionStyle: 'snake_case',
      };
      validator = new BranchValidator(config);

      const result = validator.validate('feat/test-with-hyphens');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('does not match required style');
    });

    it('should validate branch types', () => {
      const config: BranchConfig = {
        branchTypes: [{ name: 'custom', label: 'Custom' }],
        maxDescriptionLength: 30,
        ticketIdPrompt: 'skip',
        ignoredBranches: [],
        descriptionStyle: 'kebab-case',
      };
      validator = new BranchValidator(config);

      const result = validator.validate('feat/test-feature');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Invalid branch type');
    });

    it('should ignore branches in ignore list', () => {
      const config: BranchConfig = {
        branchTypes: [{ name: 'feat', label: 'Feature' }],
        maxDescriptionLength: 30,
        ticketIdPrompt: 'skip',
        ignoredBranches: ['main', 'master'],
        descriptionStyle: 'kebab-case',
      };
      validator = new BranchValidator(config);

      const result = validator.validate('main');
      expect(result.valid).toBe(true);
    });

    it('should validate ticket ID when present', () => {
      const config: BranchConfig = {
        branchTypes: [{ name: 'feat', label: 'Feature' }],
        maxDescriptionLength: 30,
        ticketIdPrompt: 'optional',
        ticketIdPrefix: 'PROJ-',
        ignoredBranches: [],
        descriptionStyle: 'kebab-case',
      };
      validator = new BranchValidator(config);

      const validResult = validator.validate('feat/PROJ-123/test-feature');
      expect(validResult.valid).toBe(true);

      const invalidResult = validator.validate('feat/WRONG-123/test-feature');
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.message).toContain('must start with "PROJ-"');
    });
  });

  describe('configuration', () => {
    it('should allow updating configuration', () => {
      const newConfig: Partial<BranchConfig> = {
        branchTypes: [{ name: 'custom', label: 'Custom Type' }],
        maxDescriptionLength: 15,
      };

      validator.updateConfig(newConfig);
      const config = validator.getConfig();

      expect(config.branchTypes).toEqual([{ name: 'custom', label: 'Custom Type' }]);
      expect(config.maxDescriptionLength).toBe(15);
    });

    it('should return current configuration', () => {
      const config = validator.getConfig();
      expect(config).toBeDefined();
      expect(config.branchTypes).toBeDefined();
      expect(config.maxDescriptionLength).toBeDefined();
      expect(config.descriptionStyle).toBeDefined();
    });
  });
});
