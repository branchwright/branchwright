import type { BranchConfig, NormalizedRuleConfig, RuleConfig, RuleSeverity, TicketIdRuleOptions } from '../types.js';

export function normalizeRuleConfig<T>(config: RuleConfig<T>): NormalizedRuleConfig<T> {
  if (typeof config === 'boolean') {
    const result: NormalizedRuleConfig<T> = {
      severity: config ? 'required' : 'off',
    };
    return result;
  }

  if (typeof config === 'string') {
    const result: NormalizedRuleConfig<T> = {
      severity: config,
    };
    return result;
  }

  if (Array.isArray(config)) {
    const [severity, options] = config;
    const result: NormalizedRuleConfig<T> = {
      severity,
    };
    if (options !== undefined) {
      result.options = options;
    }
    return result;
  }

  return config;
}

export function getTicketIdRule(config: BranchConfig): NormalizedRuleConfig<TicketIdRuleOptions> {
  if (config.rules?.ticketId !== undefined) {
    return normalizeRuleConfig(config.rules.ticketId);
  }

  const legacySeverity = config.ticketIdPrompt || 'optional';
  const severity: RuleSeverity = legacySeverity === 'skip' ? 'off' : legacySeverity;

  const result: NormalizedRuleConfig<TicketIdRuleOptions> = {
    severity,
  };

  if (config.ticketIdPrefix) {
    const options: TicketIdRuleOptions = { prefix: config.ticketIdPrefix };
    result.options = options;
  }

  return result;
}
