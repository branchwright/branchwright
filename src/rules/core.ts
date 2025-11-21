import type { RuleSeverity, TicketIdRuleOptions } from '../types.js';
import { applyDescriptionStyle, isDescriptionStyleValid } from '../utils.js';
import { createRegistry, defineRule } from './index.js';

const structureRule = defineRule(
  {
    id: 'structure',
    meta: {
      title: 'Branch structure',
      description: 'Branch names must include a type and description separated by a slash.',
      docsUrl: 'https://github.com/branchwright/branchwright#branch-structure',
    },
    defaultSeverity: 'required',
  },
  (context) => {
    if (context.segments.length < 2) {
      return {
        message: 'Branch name must follow the format: type/description or type/ticket-id/description',
      };
    }

    if (!context.branchTypeSegment) {
      return {
        message: 'Branch name must start with a valid branch type segment.',
      };
    }

    return null;
  },
);

const branchTypeRule = defineRule(
  {
    id: 'branchType',
    meta: {
      title: 'Branch type',
      description: 'Branch type must match one of the configured types.',
      docsUrl: 'https://github.com/branchwright/branchwright#branch-types',
    },
    defaultSeverity: 'required',
  },
  (context) => {
    if (!context.branchTypeSegment) {
      return null;
    }

    const validTypes = context.config.branchTypes.map((type) => type.name);

    if (!validTypes.includes(context.branchTypeSegment)) {
      return {
        message: `Invalid branch type "${context.branchTypeSegment}". Valid types: ${validTypes.join(', ')}`,
      };
    }

    return null;
  },
);

const descriptionLengthRule = defineRule(
  {
    id: 'descriptionLength',
    meta: {
      title: 'Description length',
      description: 'Descriptions should not exceed the configured maximum length.',
    },
    defaultSeverity: 'required',
  },
  (context) => {
    const description = context.descriptionSegment;
    if (!description) {
      return null;
    }

    const limit = context.config.maxDescriptionLength;

    if (description.length > limit) {
      return {
        message: `Description "${description}" exceeds maximum length of ${limit} characters`,
      };
    }

    return null;
  },
);

const descriptionStyleRule = defineRule(
  {
    id: 'descriptionStyle',
    meta: {
      title: 'Description style',
      description: 'Descriptions must follow the configured casing style.',
    },
    defaultSeverity: 'required',
  },
  (context) => {
    const description = context.descriptionSegment;
    if (!description) {
      return null;
    }

    if (isDescriptionStyleValid(description, context.config.descriptionStyle)) {
      return null;
    }

    const requiredStyle = context.config.descriptionStyle;
    const corrected = applyDescriptionStyle(description, requiredStyle);

    return {
      message: `Description "${description}" must use "${requiredStyle}" style.`,
      suggestions: [`Try "${corrected}"`],
    };
  },
);

const ticketRule = defineRule<TicketIdRuleOptions | undefined>(
  {
    id: 'ticketId',
    meta: {
      title: 'Ticket ID',
      description: 'Validates the presence and prefix of ticket identifiers.',
    },
    defaultSeverity: 'optional',
    deriveConfig: (config) => {
      const prompt = config.ticketIdPrompt ?? 'optional';
      const severity: RuleSeverity = prompt === 'skip' ? 'off' : prompt;

      if (config.ticketIdPrefix) {
        const options: TicketIdRuleOptions = { prefix: config.ticketIdPrefix };
        return [severity, options];
      }

      return severity;
    },
  },
  (context, options) => {
    const ticket = context.ticketSegment;

    if (!ticket) {
      return null;
    }

    if (options?.prefix && !ticket.startsWith(options.prefix)) {
      return {
        message: `Ticket ID "${ticket}" must start with "${options.prefix}"`,
      };
    }

    return null;
  },
);

export const coreRuleRegistry = createRegistry(
  structureRule,
  branchTypeRule,
  descriptionLengthRule,
  descriptionStyleRule,
  ticketRule,
);

export const coreRules = {
  structure: structureRule,
  branchType: branchTypeRule,
  descriptionLength: descriptionLengthRule,
  descriptionStyle: descriptionStyleRule,
  ticketId: ticketRule,
};
