import { existsSync } from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

import { DEFAULT_CONFIG } from './config.js';
import type { BranchConfig, BranchIgnorePattern, DescriptionStyle } from './types.js';

const GLOB_ESCAPE_REGEX = /[.*+?^${}()|[\]\\]/g;

function escapeRegex(value: string): string {
  return value.replace(GLOB_ESCAPE_REGEX, '\\$&');
}

function globToRegExp(glob: string): RegExp {
  const escaped = escapeRegex(glob);
  const pattern = `^${escaped.replace(/\\\*/g, '.*').replace(/\\\?/g, '.')}$`;
  return new RegExp(pattern);
}

function matchesPattern(branchName: string, pattern: BranchIgnorePattern): boolean {
  if (pattern instanceof RegExp) {
    return pattern.test(branchName);
  }

  return globToRegExp(pattern).test(branchName);
}

const STYLE_REGEX: Record<DescriptionStyle, RegExp> = {
  'kebab-case': /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  snake_case: /^[a-z0-9]+(?:_[a-z0-9]+)*$/,
  PascalCase: /^[A-Z][A-Za-z0-9]*$/,
  camelCase: /^[a-z][A-Za-z0-9]*$/,
};

function splitIntoWords(raw: string): string[] {
  const trimmed = raw.trim();

  if (!trimmed) {
    return [];
  }

  const spaced = trimmed
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2');

  return spaced
    .split(/\s+/)
    .map((segment) => segment.replace(/[^A-Za-z0-9]/g, ''))
    .filter(Boolean);
}

function capitalizeWord(word: string): string {
  if (!word) {
    return '';
  }

  const lower = word.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function isDescriptionStyleValid(value: string, style: DescriptionStyle): boolean {
  return STYLE_REGEX[style].test(value);
}

export function applyDescriptionStyle(raw: string, style: DescriptionStyle): string {
  const trimmed = raw.trim();

  if (!trimmed) {
    return '';
  }

  if (isDescriptionStyleValid(trimmed, style)) {
    return trimmed;
  }

  const words = splitIntoWords(trimmed);

  if (!words.length) {
    return '';
  }

  switch (style) {
    case 'kebab-case':
      return words.map((word) => word.toLowerCase()).join('-');
    case 'snake_case':
      return words.map((word) => word.toLowerCase()).join('_');
    case 'PascalCase':
      return words.map((word) => capitalizeWord(word)).join('');
    case 'camelCase':
      return words
        .map((word, index) => {
          const lower = word.toLowerCase();
          return index === 0 ? lower : capitalizeWord(lower);
        })
        .join('');
    default: {
      const exhaustiveCheck: never = style;
      throw new Error(`Unsupported description style: ${exhaustiveCheck}`);
    }
  }
}

export function buildBranchName(branchType: string, description: string, ticketId?: string, template?: string): string {
  // If no template is provided, use legacy format
  if (!template) {
    const parts = [branchType];
    if (ticketId) {
      parts.push(ticketId);
    }
    parts.push(description);
    return parts.join('/');
  }

  // Use template with placeholder replacement
  const placeholders: TemplatePlaceholders = {
    type: branchType,
    desc: description,
  };

  if (ticketId) {
    placeholders.ticket = ticketId;
  }

  return buildBranchNameFromTemplate(template, placeholders);
}

export interface TemplatePlaceholders {
  type: string;
  ticket?: string;
  desc: string;
}

export function buildBranchNameFromTemplate(template: string, placeholders: TemplatePlaceholders): string {
  let result = template;

  // Replace all placeholders
  result = result.replace(/\{\{type\}\}/g, placeholders.type);
  result = result.replace(/\{\{ticket\}\}/g, placeholders.ticket || '');
  result = result.replace(/\{\{desc\}\}/g, placeholders.desc);

  // Clean up any double slashes or empty segments that might result from empty placeholders
  result = result.replace(/\/+/g, '/'); // Replace multiple slashes with single slash
  result = result.replace(/^\/|\/$/g, ''); // Remove leading/trailing slashes
  result = result.replace(/\/-/g, '/'); // Remove orphaned hyphens after slashes
  result = result.replace(/-\//g, '/'); // Remove orphaned hyphens before slashes

  return result;
}

type IgnoredBranchesInput = BranchConfig['ignoredBranches'] | undefined;

function normalizeIgnoredBranches(input: IgnoredBranchesInput): BranchConfig['ignoredBranches'] {
  if (!Array.isArray(input)) {
    return DEFAULT_CONFIG.ignoredBranches;
  }

  return input.filter((entry): entry is string | RegExp => typeof entry === 'string' || entry instanceof RegExp);
}

export async function loadConfig(): Promise<BranchConfig> {
  const configPath = path.resolve(process.cwd(), 'branchwright.config.ts');

  if (!existsSync(configPath)) {
    return DEFAULT_CONFIG;
  }

  try {
    const module = await import(pathToFileURL(configPath).href);
    const userConfig = (module.default ?? module) as Partial<BranchConfig> | BranchConfig;
    const partial = userConfig as Partial<BranchConfig>;

    return {
      ...DEFAULT_CONFIG,
      ...userConfig,
      branchTypes: partial.branchTypes?.length ? partial.branchTypes : DEFAULT_CONFIG.branchTypes,
      ignoredBranches: normalizeIgnoredBranches(partial.ignoredBranches),
    };
  } catch (error) {
    console.error('Failed to load branchwright.config.ts. Falling back to defaults.');
    console.error(error);
    return DEFAULT_CONFIG;
  }
}

export interface LintResult {
  isValid: boolean;
  errors: string[];
}

export function lintBranchName(branchName: string, config: BranchConfig): LintResult {
  const errors: string[] = [];

  // Check if branch should be ignored
  const isIgnored = config.ignoredBranches.some((pattern) => matchesPattern(branchName, pattern));
  if (isIgnored) {
    return { isValid: true, errors: [] };
  }

  // Parse branch name format: type/[ticket-id/]description
  const parts = branchName.split('/');

  if (parts.length < 2) {
    errors.push('Branch name must follow the format: type/description or type/ticket-id/description');
    return { isValid: false, errors };
  }

  const [branchType, ...rest] = parts;

  // Validate branch type
  const validTypes = config.branchTypes.map((type) => type.name);
  if (!validTypes.includes(branchType)) {
    errors.push(`Invalid branch type "${branchType}". Valid types: ${validTypes.join(', ')}`);
  }

  // Get description (last part)
  const description = rest[rest.length - 1];

  // Validate description length
  if (description.length > config.maxDescriptionLength) {
    errors.push(`Description "${description}" exceeds maximum length of ${config.maxDescriptionLength} characters`);
  }

  // Validate description style
  if (!isDescriptionStyleValid(description, config.descriptionStyle)) {
    const corrected = applyDescriptionStyle(description, config.descriptionStyle);
    errors.push(
      `Description "${description}" does not match required style "${config.descriptionStyle}". ` +
        `Suggested: "${corrected}"`,
    );
  }

  // Validate ticket ID if present
  if (rest.length === 2) {
    const ticketId = rest[0];
    if (config.ticketIdPrefix && !ticketId.startsWith(config.ticketIdPrefix)) {
      errors.push(`Ticket ID "${ticketId}" must start with "${config.ticketIdPrefix}"`);
    }
  }

  return { isValid: errors.length === 0, errors };
}

export interface ParsedDescription {
  description: string;
  hasTicket: boolean;
  ticketError?: string | undefined;
}

export function parseUserDescription(input: string, config: BranchConfig): ParsedDescription {
  const trimmed = input.trim();

  if (!trimmed) {
    return {
      description: '',
      hasTicket: false,
      ticketError: 'Description cannot be empty.',
    };
  }

  // Check if input contains ticket ID pattern
  const ticketPattern = config.ticketIdPrefix
    ? new RegExp(`^${escapeRegex(config.ticketIdPrefix)}\\d+\\s+(.+)$`)
    : /^[A-Z]+-\d+\s+(.+)$/;

  const ticketMatch = ticketPattern.exec(trimmed);

  if (ticketMatch) {
    const [, extractedDescription] = ticketMatch;
    const styledDescription = applyDescriptionStyle(extractedDescription, config.descriptionStyle);

    if (styledDescription.length > config.maxDescriptionLength) {
      return {
        description: styledDescription,
        hasTicket: true,
        ticketError: `Description exceeds maximum length of ${config.maxDescriptionLength} characters.`,
      };
    }

    return {
      description: styledDescription,
      hasTicket: true,
    };
  }

  // No ticket ID found, process as plain description
  const styledDescription = applyDescriptionStyle(trimmed, config.descriptionStyle);

  if (styledDescription.length > config.maxDescriptionLength) {
    return {
      description: styledDescription,
      hasTicket: false,
      ticketError: `Description exceeds maximum length of ${config.maxDescriptionLength} characters.`,
    };
  }

  return {
    description: styledDescription,
    hasTicket: false,
  };
}
