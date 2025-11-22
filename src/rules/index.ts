import type {
  BranchConfig,
  NormalizedRuleConfig,
  RuleConfig,
  RuleContext,
  RuleDefinition,
  RuleManifest,
  RuleSeverity,
} from '../types.js';
import { normalizeRuleConfig } from './helpers.js';

export function defineRule<TOptions>(manifest: RuleManifest<TOptions>, evaluate: RuleDefinition<TOptions>['evaluate']) {
  return Object.freeze({ manifest, evaluate }) as RuleDefinition<TOptions>;
}

export class RuleRegistry {
  private readonly definitions = new Map<string, RuleDefinition<any>>();

  register<TOptions>(definition: RuleDefinition<TOptions>): this {
    const { id } = definition.manifest;
    if (this.definitions.has(id)) {
      throw new Error(`Rule with id "${id}" is already registered.`);
    }

    this.definitions.set(id, definition as RuleDefinition<any>);
    return this;
  }

  get<TOptions>(id: string): RuleDefinition<TOptions> | undefined {
    return this.definitions.get(id) as RuleDefinition<TOptions> | undefined;
  }

  entries(): RuleDefinition<any>[] {
    return Array.from(this.definitions.values());
  }

  ids(): string[] {
    return Array.from(this.definitions.keys());
  }

  has(id: string): boolean {
    return this.definitions.has(id);
  }
}

export function createRegistry(...rules: RuleDefinition<any>[]): RuleRegistry {
  const registry = new RuleRegistry();
  rules.forEach((rule) => {
    registry.register(rule);
  });
  return registry;
}

function parseTicketSegment(segments: string[]): string | null {
  if (segments.length === 3) {
    return segments[1];
  }

  return null;
}

function parseDescriptionSegment(segments: string[]): string | null {
  if (segments.length >= 2) {
    return segments[segments.length - 1];
  }

  return null;
}

export async function evaluateRules(
  branchName: string,
  config: BranchConfig,
  registry: RuleRegistry,
): Promise<RuleExecution[]> {
  const segments = branchName.split('/');
  const context = createRuleContext({
    branchName,
    segments,
    branchTypeSegment: segments[0] ?? null,
    ticketSegment: parseTicketSegment(segments),
    descriptionSegment: parseDescriptionSegment(segments),
    config,
  });

  const results: RuleExecution[] = [];

  for (const definition of registry.entries()) {
    const resolved = resolveRuleConfig(config, definition);
    const execution = await evaluateRule(definition, context, resolved);

    if (execution) {
      results.push(execution);
    }
  }

  return results;
}

export function resolveRuleConfig<TOptions>(
  config: BranchConfig,
  rule: RuleDefinition<TOptions>,
): NormalizedRuleConfig<TOptions> {
  const rulesMap = config.rules as Record<string, RuleConfig<unknown>> | undefined;
  const manifest = rule.manifest;

  const custom = rulesMap?.[manifest.id];
  if (custom !== undefined) {
    return normalizeRuleConfig(custom as RuleConfig<TOptions>);
  }

  if (manifest.deriveConfig) {
    const derived = manifest.deriveConfig(config);
    if (derived !== undefined) {
      return normalizeRuleConfig(derived);
    }
  }

  const fallback: NormalizedRuleConfig<TOptions> = {
    severity: manifest.defaultSeverity,
  };

  if (manifest.defaultOptions !== undefined) {
    fallback.options = manifest.defaultOptions;
  }

  return fallback;
}

export interface RuleExecution {
  ruleId: string;
  severity: RuleSeverity;
  message: string;
  suggestions?: string[] | undefined;
}

export async function evaluateRule<TOptions>(
  definition: RuleDefinition<TOptions>,
  context: Readonly<RuleContext>,
  config: NormalizedRuleConfig<TOptions>,
): Promise<RuleExecution | null> {
  if (config.severity === 'off') {
    return null;
  }

  const safeOptions = prepareRuleOptions(config.options) as Readonly<TOptions | undefined>;
  const issue = await definition.evaluate(context, safeOptions);

  if (issue == null) {
    return null;
  }

  if (typeof issue.message !== 'string' || issue.message.trim() === '') {
    throw new Error(`Rule "${definition.manifest.id}" returned an invalid message.`);
  }

  if (issue.suggestions && !Array.isArray(issue.suggestions)) {
    throw new Error(`Rule "${definition.manifest.id}" suggestions must be an array of strings.`);
  }

  if (issue.suggestions) {
    issue.suggestions.forEach((suggestion, index) => {
      if (typeof suggestion !== 'string') {
        throw new Error(
          `Rule "${definition.manifest.id}" suggestion at index ${index} must be a string.` +
            ` Received ${typeof suggestion}.`,
        );
      }
    });
  }

  const severity = issue.severity ?? config.severity;

  return {
    ruleId: definition.manifest.id,
    severity,
    message: issue.message,
    suggestions: issue.suggestions,
  };
}

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

function assertSerializable(value: unknown, path = 'options'): void {
  if (value === undefined) {
    return;
  }

  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      assertSerializable(entry, `${path}[${index}]`);
    });
    return;
  }

  if (typeof value === 'object') {
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      assertSerializable(entry, `${path}.${key}`);
    }
    return;
  }

  throw new Error(`Rule ${path} must be JSON-serializable. Unsupported value type: ${typeof value}`);
}

function cloneJson<T extends JsonValue>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => cloneJson(entry)) as T;
  }

  const clone: Record<string, JsonValue> = {};
  for (const [key, entry] of Object.entries(value as Record<string, JsonValue>)) {
    clone[key] = cloneJson(entry);
  }
  return clone as T;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value);

    if (Array.isArray(value)) {
      value.forEach((entry) => deepFreeze(entry));
    } else {
      Object.values(value as Record<string, unknown>).forEach((entry) => {
        deepFreeze(entry);
      });
    }
  }

  return value;
}

function cloneConfig(config: BranchConfig): BranchConfig {
  const cloned: BranchConfig = {
    ...config,
    branchTypes: config.branchTypes.map((type) => ({ ...type })),
    ignoredBranches: [...config.ignoredBranches],
  };

  if (config.rules) {
    cloned.rules = { ...config.rules };
  }

  if (config.template !== undefined) {
    cloned.template = config.template;
  }

  if (config.ticketIdPrompt !== undefined) {
    cloned.ticketIdPrompt = config.ticketIdPrompt;
  }

  if (config.ticketIdPrefix !== undefined) {
    cloned.ticketIdPrefix = config.ticketIdPrefix;
  }

  return cloned;
}

export interface RuleContextInput {
  branchName: string;
  segments: string[];
  branchTypeSegment?: string | null | undefined;
  ticketSegment?: string | null | undefined;
  descriptionSegment?: string | null | undefined;
  config: BranchConfig;
}

export function createRuleContext(input: RuleContextInput): Readonly<RuleContext> {
  const context: RuleContext = {
    branchName: input.branchName,
    segments: deepFreeze([...input.segments]),
    branchTypeSegment: input.branchTypeSegment ?? null,
    ticketSegment: input.ticketSegment ?? null,
    descriptionSegment: input.descriptionSegment ?? null,
    config: deepFreeze(cloneConfig(input.config)),
  };

  return deepFreeze(context);
}

export function prepareRuleOptions<TOptions>(options: TOptions | undefined): Readonly<TOptions | undefined> {
  assertSerializable(options);
  if (options === undefined || options === null) {
    return options;
  }

  const snapshot = cloneJson(options as JsonValue) as TOptions;
  return deepFreeze(snapshot);
}
