import path from 'node:path';
import { pathToFileURL } from 'node:url';

import type { RuleConfig, RuleDefinition, RuleExtensionSource, RulePresetSource } from '../types.js';

export interface RuleExtensionResolutionOptions {
  baseDir: string;
}

const BUILTIN_RULE_PRESETS: Record<string, Record<string, RuleConfig>> = {
  recommended: {
    structure: 'required',
    branchType: 'required',
    descriptionLength: ['required', { min: 5, max: 50 }],
    descriptionStyle: ['required', { style: 'kebab-case' }],
    ticketId: 'optional',
  },
};

function resolveModuleSpecifier(source: string, baseDir: string): string {
  if (source.startsWith('file://')) {
    return source;
  }

  if (source.startsWith('.') || source.startsWith('/') || source.startsWith('\\')) {
    const absolute = path.isAbsolute(source) ? source : path.resolve(baseDir, source);
    return pathToFileURL(absolute).href;
  }

  return source;
}

async function importModule(specifier: string): Promise<unknown> {
  const module = await import(specifier);
  return module?.default ?? module;
}

function normalizeRuleDefinitions(value: unknown, source: string): RuleDefinition<any>[] {
  if (!value) {
    throw new Error(`Rule plugin "${source}" did not export any rules.`);
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      if (!item || typeof item !== 'object' || typeof (item as RuleDefinition<any>).manifest?.id !== 'string') {
        throw new Error(`Rule plugin "${source}" has an invalid rule entry at index ${index}.`);
      }
    });
    return value as RuleDefinition<any>[];
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;

    if (typeof record.entries === 'function') {
      const entries = record.entries();
      const array = Array.isArray(entries) ? entries : Array.from(entries as Iterable<RuleDefinition<any>>);
      return normalizeRuleDefinitions(array, source);
    }

    if (record.rules !== undefined) {
      return normalizeRuleDefinitions(record.rules, source);
    }
  }

  throw new Error(
    `Rule plugin "${source}" must default export an array of rule definitions, ` +
      'a RuleRegistry, or an object with a "rules" field.',
  );
}

function normalizePreset(value: unknown, source: string): Record<string, RuleConfig> {
  const exported = value ?? {};

  if (typeof exported !== 'object' || exported === null) {
    throw new Error(`Rule preset "${source}" must default export an object.`);
  }

  const candidate = (exported as { rules?: Record<string, RuleConfig> }).rules ?? exported;

  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
    throw new Error(`Rule preset "${source}" must provide a "rules" object mapping rule ids to configurations.`);
  }

  const result: Record<string, RuleConfig> = {};
  for (const [ruleId, ruleConfig] of Object.entries(candidate)) {
    result[ruleId] = ruleConfig as RuleConfig;
  }

  return result;
}

export async function loadRuleDefinitionSets(
  sources: RuleExtensionSource[] | undefined,
  options: RuleExtensionResolutionOptions,
): Promise<RuleDefinition<any>[]> {
  if (!sources?.length) {
    return [];
  }

  const definitions: RuleDefinition<any>[] = [];
  for (const source of sources) {
    if (!source) {
      continue;
    }

    const specifier = resolveModuleSpecifier(source, options.baseDir);
    const exported = await importModule(specifier);
    const rules = normalizeRuleDefinitions(exported, source);
    definitions.push(...rules);
  }

  return definitions;
}

export async function loadRulePresetConfigs(
  sources: RulePresetSource[] | undefined,
  options: RuleExtensionResolutionOptions,
): Promise<Record<string, RuleConfig>> {
  if (!sources?.length) {
    return {};
  }

  const merged: Record<string, RuleConfig> = {};

  for (const source of sources) {
    if (!source) {
      continue;
    }

    if (BUILTIN_RULE_PRESETS[source]) {
      Object.assign(merged, BUILTIN_RULE_PRESETS[source]);
      continue;
    }

    const specifier = resolveModuleSpecifier(source, options.baseDir);
    const exported = await importModule(specifier);
    const preset = normalizePreset(exported, source);
    Object.assign(merged, preset);
  }

  return merged;
}

export function getBuiltinPreset(name: string): Record<string, RuleConfig> | undefined {
  return BUILTIN_RULE_PRESETS[name];
}
