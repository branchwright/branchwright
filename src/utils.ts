import { bundleRequire } from 'bundle-require';
import { cosmiconfig, defaultLoaders } from 'cosmiconfig';
import type { Loaders } from 'cosmiconfig';
import path from 'node:path';

import { DEFAULT_CONFIG } from './config.js';
import { coreRuleRegistry, coreRules } from './rules/core.js';
import { loadRulePresetConfigs } from './rules/extensions.js';
import { type RuleExecution, type RuleRegistry, evaluateRules, resolveRuleConfig } from './rules/index.js';
import type {
  BranchConfig,
  BranchIgnorePattern,
  DescriptionStyle,
  NormalizedRuleConfig,
  TicketIdRuleOptions,
} from './types.js';

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

function buildTicketIdPattern(prefix?: string): string {
  if (!prefix) {
    return '[A-Z]+-\\d+';
  }
  return `${escapeRegex(prefix)}\\d+`;
}

interface TicketInfo {
  ticket: string;
  separator: string;
  rest: string;
  position: 'leading' | 'trailing';
}

function extractTicketFromDescription(
  description: string,
  ticketRule: NormalizedRuleConfig<TicketIdRuleOptions | undefined>,
): TicketInfo | null {
  if (ticketRule.severity === 'off') {
    return null;
  }

  const ticketPattern = buildTicketIdPattern(ticketRule.options?.prefix);

  const leadingPattern = new RegExp(`^(${ticketPattern})([-_\\s]+)?(.+)?$`);
  const leadingMatch = leadingPattern.exec(description);
  if (leadingMatch) {
    const [, ticket, separator, rest] = leadingMatch;
    return {
      ticket,
      separator: separator ?? '',
      rest: rest ?? '',
      position: 'leading',
    };
  }

  const trailingPattern = new RegExp(`^(.+?)([-_\\s]+)(${ticketPattern})$`);
  const trailingMatch = trailingPattern.exec(description);
  if (trailingMatch) {
    const [, rest, separator, ticket] = trailingMatch;
    return {
      ticket,
      separator: separator ?? '',
      rest,
      position: 'trailing',
    };
  }

  return null;
}

function rebuildDescriptionWithTicket(body: string, ticketInfo: TicketInfo | null): string {
  if (!ticketInfo) {
    return body;
  }

  if (!body) {
    return ticketInfo.ticket;
  }

  return ticketInfo.position === 'trailing'
    ? `${body}${ticketInfo.separator}${ticketInfo.ticket}`
    : `${ticketInfo.ticket}${ticketInfo.separator}${body}`;
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

const MODULE_NAME = 'branchwright';

const SEARCH_PLACES = [
  'package.json',
  '.branchwrightrc',
  '.branchwrightrc.json',
  '.branchwrightrc.yaml',
  '.branchwrightrc.yml',
  '.branchwrightrc.js',
  '.branchwrightrc.cjs',
  '.branchwrightrc.mjs',
  '.branchwrightrc.ts',
  'branchwright.config.js',
  'branchwright.config.cjs',
  'branchwright.config.mjs',
  'branchwright.config.ts',
  'branchwright.config.json',
  'branchwright.config.yaml',
  'branchwright.config.yml',
] as const;

const loadTypeScriptConfig = async (filePath: string) => {
  const { mod } = await bundleRequire({
    filepath: filePath,
    format: 'cjs',
    external: ['@branchwright/cli'],
    esbuildOptions: {
      platform: 'node',
      target: ['node18'],
    },
  });

  return mod.default ?? mod;
};

const CONFIG_LOADERS = {
  ...defaultLoaders,
  '.ts': loadTypeScriptConfig,
  '.cts': loadTypeScriptConfig,
  '.mts': loadTypeScriptConfig,
} satisfies Loaders;

const explorer = cosmiconfig(MODULE_NAME, {
  searchPlaces: [...SEARCH_PLACES],
  loaders: CONFIG_LOADERS,
});

type IgnoredBranchesInput = BranchConfig['ignoredBranches'] | undefined;

function normalizeIgnoredBranches(input: IgnoredBranchesInput): BranchConfig['ignoredBranches'] {
  if (!Array.isArray(input)) {
    return DEFAULT_CONFIG.ignoredBranches;
  }

  return input.filter((entry): entry is string | RegExp => typeof entry === 'string' || entry instanceof RegExp);
}

export interface LoadConfigOptions {
  cwd?: string;
}

export interface LoadConfigResult {
  config: BranchConfig;
  filepath?: string;
}

export async function loadConfigWithMeta(options: LoadConfigOptions = {}): Promise<LoadConfigResult> {
  const searchFrom = options.cwd ?? process.cwd();

  try {
    const result = await explorer.search(searchFrom);
    const filepath = result?.filepath;

    if (!result || result.isEmpty || typeof result.config !== 'object' || result.config === null) {
      const config = {
        ...DEFAULT_CONFIG,
        branchTypes: [...DEFAULT_CONFIG.branchTypes],
        ignoredBranches: [...DEFAULT_CONFIG.ignoredBranches],
        plugins: [...(DEFAULT_CONFIG.plugins ?? [])],
        presets: [...(DEFAULT_CONFIG.presets ?? [])],
        rules: { ...DEFAULT_CONFIG.rules },
      } satisfies BranchConfig;

      const resultPayload: LoadConfigResult = { config };
      if (filepath) {
        resultPayload.filepath = filepath;
      }

      return resultPayload;
    }

    const userConfig = result.config as Partial<BranchConfig>;
    const baseDir = filepath ? path.dirname(filepath) : searchFrom;
    const plugins = Array.isArray(userConfig.plugins) ? [...userConfig.plugins] : [...(DEFAULT_CONFIG.plugins ?? [])];
    const presets = Array.isArray(userConfig.presets) ? [...userConfig.presets] : [...(DEFAULT_CONFIG.presets ?? [])];

    const presetRules = await loadRulePresetConfigs(presets, { baseDir });
    const mergedRules = {
      ...presetRules,
      ...(userConfig.rules ?? {}),
    };

    const config: BranchConfig = {
      ...DEFAULT_CONFIG,
      ...userConfig,
      branchTypes: userConfig.branchTypes?.length ? [...userConfig.branchTypes] : [...DEFAULT_CONFIG.branchTypes],
      ignoredBranches: normalizeIgnoredBranches(userConfig.ignoredBranches),
      plugins,
      presets,
      rules: mergedRules,
    };

    const resultPayload: LoadConfigResult = { config };
    if (filepath) {
      resultPayload.filepath = filepath;
    }

    return resultPayload;
  } catch (error) {
    console.error('Failed to load Branchwright configuration. Falling back to defaults.');
    if (process.env.BRANCHWRIGHT_DEBUG === 'true') {
      console.error(error);
    } else if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(String(error));
    }
    const fallbackConfig: BranchConfig = {
      ...DEFAULT_CONFIG,
      branchTypes: [...DEFAULT_CONFIG.branchTypes],
      ignoredBranches: [...DEFAULT_CONFIG.ignoredBranches],
      plugins: [...(DEFAULT_CONFIG.plugins ?? [])],
      presets: [...(DEFAULT_CONFIG.presets ?? [])],
      rules: { ...DEFAULT_CONFIG.rules },
    };
    return {
      config: fallbackConfig,
    };
  }
}

export async function loadConfig(options: LoadConfigOptions = {}): Promise<BranchConfig> {
  const { config } = await loadConfigWithMeta(options);
  return config;
}

export interface LintResult {
  isValid: boolean;
  errors: string[];
  violations?: RuleExecution[] | undefined;
}

export async function lintBranchName(
  branchName: string,
  config: BranchConfig,
  registry: RuleRegistry = coreRuleRegistry,
): Promise<LintResult> {
  const isIgnored = config.ignoredBranches.some((pattern) => matchesPattern(branchName, pattern));
  if (isIgnored) {
    return { isValid: true, errors: [] };
  }

  const violations = await evaluateRules(branchName, config, registry);
  const errors = violations.map((violation) => violation.message);

  return {
    isValid: violations.length === 0,
    errors,
    violations,
  };
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

  const ticketRule = resolveRuleConfig(config, coreRules.ticketId);
  const ticketInfo = extractTicketFromDescription(trimmed, ticketRule);
  const descriptionBody = ticketInfo ? ticketInfo.rest : trimmed;
  const hasTicket = Boolean(ticketInfo);

  if (!descriptionBody.trim()) {
    return {
      description: rebuildDescriptionWithTicket('', ticketInfo),
      hasTicket,
      ticketError: 'Description cannot be empty.',
    };
  }

  const styledDescription = applyDescriptionStyle(descriptionBody, config.descriptionStyle);

  if (styledDescription.length > config.maxDescriptionLength) {
    return {
      description: rebuildDescriptionWithTicket(styledDescription, ticketInfo),
      hasTicket,
      ticketError: `Description exceeds maximum length of ${config.maxDescriptionLength} characters.`,
    };
  }

  return {
    description: rebuildDescriptionWithTicket(styledDescription, ticketInfo),
    hasTicket,
  };
}

export { getTicketIdRule, normalizeRuleConfig } from './rules/helpers.js';
