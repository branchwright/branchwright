// Rules System Types
export type RuleSeverity = 'off' | 'optional' | 'required';

export interface NormalizedRuleConfig<T = any> {
  severity: RuleSeverity;
  options?: T | undefined;
}

// Rule configuration can be:
// - boolean: true = 'required', false = 'off'
// - string: 'off', 'optional', 'required'
// - array: [severity, options]
export type RuleConfig<T = any> = boolean | RuleSeverity | [RuleSeverity, T] | NormalizedRuleConfig<T>;

// Specific rule option types
export interface TicketIdRuleOptions {
  prefix?: string;
}

// Rules interface - extensible for future rules
export interface Rules {
  ticketId?: RuleConfig<TicketIdRuleOptions>;
  [ruleId: string]: RuleConfig<any> | undefined;
}

// Legacy types for backward compatibility
export type TicketIdPromptMode = 'required' | 'optional' | 'skip';

export type BranchIgnorePattern = string | RegExp;

export type DescriptionStyle = 'kebab-case' | 'snake_case' | 'PascalCase' | 'camelCase';

export interface BranchTypeOption {
  name: string;
  label: string;
}

export interface InteractiveQuestions {
  /** Whether to show the base branch question */
  baseBranch?: boolean;
  /** Whether to show the checkout question */
  checkout?: boolean;
  /** Whether to show the push to remote question */
  pushToRemote?: boolean;
}

export interface QuestionConfig {
  /** Custom text for the branch type selection prompt */
  branchType?: string;
  /** Custom text for the ticket ID prompt */
  ticketId?: string;
  /** Custom text for the required ticket ID prompt */
  ticketIdRequired?: string;
  /** Custom text for the description prompt */
  description?: string;
  /** Custom text for the description prompt when ticket ID is provided */
  descriptionWithTicket?: string;
  /** Custom text for the base branch prompt */
  baseBranch?: string;
  /** Custom text for the checkout confirmation prompt */
  checkout?: string;
  /** Custom text for the proceed confirmation prompt */
  proceed?: string;
  /** Custom text for the push to remote confirmation prompt */
  pushToRemote?: string;
}

export interface BranchConfig {
  /** List of branch types */
  branchTypes: BranchTypeOption[];
  /** Maximum length of branch description */
  maxDescriptionLength: number;
  /** Branch names or patterns that should be ignored by linting */
  ignoredBranches: BranchIgnorePattern[];
  /** Enforced branch description casing style */
  descriptionStyle: DescriptionStyle;
  /** Template for branch name format. Placeholders: {{type}}, {{ticket}}, {{desc}} */
  template?: string | undefined;
  /** Additional rule definition sets to load */
  plugins?: RuleExtensionSource[] | undefined;
  /** Rule presets to merge into the configuration */
  presets?: RulePresetSource[] | undefined;
  /** Rules configuration */
  rules?: Rules;
  /** Control which optional questions are shown during interactive branch creation */
  extraQuestions?: InteractiveQuestions;
  /** Customize the text of prompts shown during interactive branch creation */
  questions?: QuestionConfig;
  /** Show CLI tips about using flags (default: true) */
  showCliTips?: boolean;
  /** @deprecated Use rules.ticketId instead. Ticket ID prompt mode. */
  ticketIdPrompt?: TicketIdPromptMode;
  /** @deprecated Use rules.ticketId[1].prefix instead. Ticket ID prefix */
  ticketIdPrefix?: string | undefined;
}

export type Config = Partial<BranchConfig>;

export type RuleExtensionSource = string;

export type RulePresetSource = string;

// Legacy interface for backward compatibility
export interface BranchType {
  /** Type identifier */
  type: string;
  /** Display name for the type */
  name: string;
  /** Description of when to use this type */
  description: string;
  /** Pattern template (e.g., "feature/{description}") */
  pattern: string;
}

export interface ValidationResult {
  /** Whether the branch name is valid */
  valid: boolean;
  /** Error message if invalid */
  message?: string | undefined;
  /** Suggestions for fixing the issue */
  suggestions?: string[] | undefined;
}

export interface CreateBranchOptions {
  /** Whether to create and switch to the branch */
  checkout?: boolean;
  /** Base branch to create from */
  baseBranch?: string;
  /** Dry run - don't actually create the branch */
  dryRun?: boolean;
  /** Pre-specified branch type */
  type?: string;
  /** Pre-specified ticket ID */
  ticketId?: string;
  /** Pre-specified description */
  description?: string;
  /** Skip proceed confirmation */
  skipProceed?: boolean;
  /** Push to remote after creation */
  pushToRemote?: boolean;
}

export interface BranchwrightOptions {
  /** Branch configuration */
  config?: BranchConfig;
  /** Available branch types */
  types?: BranchType[];
  /** Git repository path */
  cwd?: string;
}

export interface RuleMeta {
  title: string;
  description?: string | undefined;
  docsUrl?: string | undefined;
  examples?: string[] | undefined;
}

export interface RuleContext {
  branchName: string;
  segments: readonly string[];
  branchTypeSegment?: string | null | undefined;
  ticketSegment?: string | null | undefined;
  descriptionSegment?: string | null | undefined;
  config: Readonly<BranchConfig>;
}

export interface RuleIssue {
  message: string;
  suggestions?: string[] | undefined;
  severity?: RuleSeverity | undefined;
}

export type MaybePromise<T> = Promise<T> | T;

export type RuleEvaluator<TOptions = unknown> = (
  context: Readonly<RuleContext>,
  options: Readonly<TOptions | undefined>,
) => MaybePromise<RuleIssue | null | undefined>;

export interface RuleManifest<TOptions = unknown> {
  id: string;
  meta: RuleMeta;
  defaultSeverity: RuleSeverity;
  defaultOptions?: TOptions;
  deriveConfig?: (config: BranchConfig) => RuleConfig<TOptions> | undefined;
}

export interface RuleDefinition<TOptions = unknown> {
  manifest: RuleManifest<TOptions>;
  evaluate: RuleEvaluator<TOptions>;
}
