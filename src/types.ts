export type TicketIdPromptMode = 'required' | 'optional' | 'skip';

export type BranchIgnorePattern = string | RegExp;

export type DescriptionStyle = 'kebab-case' | 'snake_case' | 'PascalCase' | 'camelCase';

export interface BranchTypeOption {
  name: string;
  label: string;
}

export interface BranchConfig {
  /** List of branch types */
  branchTypes: BranchTypeOption[];
  /** Maximum length of branch description */
  maxDescriptionLength: number;
  /** JIRA Ticket ID prompt mode. `required`, `optional`, or `skip` the ticket ID prompt. */
  ticketIdPrompt: TicketIdPromptMode;
  /** JIRA Ticket ID prefix */
  ticketIdPrefix?: string | undefined;
  /** Branch names or patterns that should be ignored by linting */
  ignoredBranches: BranchIgnorePattern[];
  /** Enforced branch description casing style */
  descriptionStyle: DescriptionStyle;
  /** Template for branch name format. Placeholders: {{type}}, {{ticket}}, {{desc}} */
  template?: string | undefined;
}

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
}

export interface BranchwrightOptions {
  /** Branch configuration */
  config?: BranchConfig;
  /** Available branch types */
  types?: BranchType[];
  /** Git repository path */
  cwd?: string;
}
