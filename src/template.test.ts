import { describe, it, expect } from 'vitest';
import { buildBranchName, buildBranchNameFromTemplate } from '../src/utils.js';

describe('Template functionality', () => {
  describe('buildBranchNameFromTemplate', () => {
    it('should replace basic placeholders', () => {
      const template = '{{type}}/{{desc}}';
      const result = buildBranchNameFromTemplate(template, {
        type: 'feature',
        desc: 'add-user-auth',
      });
      expect(result).toBe('feature/add-user-auth');
    });

    it('should replace ticket id placeholder', () => {
      const template = '{{type}}/{{ticket}}-{{desc}}';
      const result = buildBranchNameFromTemplate(template, {
        type: 'bugfix',
        ticket: 'JIRA-123',
        desc: 'fix-login-bug',
      });
      expect(result).toBe('bugfix/JIRA-123-fix-login-bug');
    });

    it('should handle missing placeholders gracefully', () => {
      const template = '{{type}}/{{ticket}}-{{desc}}';
      const result = buildBranchNameFromTemplate(template, {
        type: 'feature',
        desc: 'new-feature',
      });
      expect(result).toBe('feature/new-feature');
    });

    it('should clean up empty segments', () => {
      const template = '{{type}}/{{ticket}}/{{desc}}';
      const result = buildBranchNameFromTemplate(template, {
        type: 'chore',
        desc: 'update-deps',
      });
      expect(result).toBe('chore/update-deps');
    });

    it('should handle complex templates', () => {
      const template = '{{type}}/{{ticket}}-{{desc}}-v2';
      const result = buildBranchNameFromTemplate(template, {
        type: 'feature',
        ticket: 'ABC-456',
        desc: 'user-dashboard',
      });
      expect(result).toBe('feature/ABC-456-user-dashboard-v2');
    });
  });

  describe('buildBranchName with template', () => {
    it('should use template when provided', () => {
      const result = buildBranchName(
        'feature',
        'add-authentication',
        'PROJ-789',
        '{{type}}/{{ticket}}-{{desc}}'
      );
      expect(result).toBe('feature/PROJ-789-add-authentication');
    });

    it('should fallback to default format when template is undefined', () => {
      const result = buildBranchName('bugfix', 'fix-critical-bug', 'BUG-001');
      expect(result).toBe('bugfix/BUG-001/fix-critical-bug');
    });

    it('should handle template with only type and description', () => {
      const result = buildBranchName(
        'chore',
        'update-dependencies',
        undefined,
        '{{type}}/{{desc}}'
      );
      expect(result).toBe('chore/update-dependencies');
    });
  });
});