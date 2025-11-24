#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createGenerator } from 'ts-json-schema-generator';

/**
 * @typedef {import('ts-json-schema-generator').Schema} JSONSchema
 * @typedef {import('ts-json-schema-generator').SchemaGenerator} SchemaGenerator
 * @typedef {Record<string, JSONSchema | undefined>} JSONSchemaMap
 */

const ROOT_DIR = path.resolve(process.cwd());
const SOURCE_FILE = path.resolve(ROOT_DIR, 'src/types.ts');
const TSCONFIG_PATH = path.resolve(ROOT_DIR, 'tsconfig.src.json');
const OUTPUT_DIR = path.resolve(ROOT_DIR, 'schemas');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'branchwright-config.schema.json');
const SCHEMA_ID =
  'https://raw.githubusercontent.com/branchwright/branchwright/main/schemas/branchwright-config.schema.json';

/** @type {SchemaGenerator} */
const generator = createGenerator({
  tsconfig: TSCONFIG_PATH,
  path: SOURCE_FILE,
  type: 'Config',
  expose: 'all',
  jsDoc: 'extended',
  skipTypeCheck: false,
});

/** @type {JSONSchema} */
const rawSchema = generator.createSchema('Config');
/** @type {JSONSchema} */
const refinedSchema = refineSchema(rawSchema);

await mkdir(OUTPUT_DIR, { recursive: true });
await writeJson(OUTPUT_FILE, refinedSchema);

console.log(`✔️  Generated Branchwright schema → ${path.relative(ROOT_DIR, OUTPUT_FILE)}`);

/**
 * Applies post-processing tweaks on the generated schema so it aligns with our publishing expectations.
 * @param {JSONSchema} schema Generated schema from ts-json-schema-generator.
 * @returns {JSONSchema} Refined schema ready to be written to disk.
 */
function refineSchema(schema) {
  const result = structuredClone(schema);
  result.$id = SCHEMA_ID;
  result.$schema = 'http://json-schema.org/draft-07/schema#';
  result.title = 'Branchwright Configuration Schema';
  result.description = 'Schema definition for .branchwrightrc(.json/.yaml) configuration files.';

  if (!result.definitions) {
    result.definitions = {};
  }

  /** @type {JSONSchemaMap} */
  const definitions = /** @type {JSONSchemaMap} */ (result.definitions);
  const configDefinition = isSchemaObject(definitions.BranchConfig) ? definitions.BranchConfig : undefined;

  if (configDefinition) {
    // Top-level config meta
    configDefinition.title = 'Branchwright Configuration';
    configDefinition.description =
      'Configuration object that controls Branchwright branch naming rules and CLI behaviour.';

    // branchTypes
    if (!configDefinition.properties) {
      configDefinition.properties = {};
    }
    const configProperties = /** @type {Record<string, JSONSchema | undefined>} */ (configDefinition.properties);

    const branchTypes = configProperties.branchTypes;
    if (isSchemaObject(branchTypes)) {
      ensureArray(branchTypes);
      branchTypes.minItems = 1;
      branchTypes.description = branchTypes.description ?? 'List of branch types available to users.';
    }

    const branchTypeOption = isSchemaObject(definitions.BranchTypeOption) ? definitions.BranchTypeOption : undefined;
    if (branchTypeOption?.properties) {
      const optionProperties = /** @type {Record<string, JSONSchema | undefined>} */ (branchTypeOption.properties);
      const nameDefinition = optionProperties.name;
      if (isSchemaObject(nameDefinition)) {
        nameDefinition.description = 'Identifier for the branch type (used in branch names).';
      }
      const labelDefinition = optionProperties.label;
      if (isSchemaObject(labelDefinition)) {
        labelDefinition.description = 'Label shown in interactive prompts.';
      }
    }

    // maxDescriptionLength
    const maxDescriptionLength = configProperties.maxDescriptionLength;
    if (isSchemaObject(maxDescriptionLength)) {
      maxDescriptionLength.type = 'integer';
      maxDescriptionLength.minimum = 1;
      maxDescriptionLength.description =
        maxDescriptionLength.description ?? 'Maximum allowed characters for the branch description segment.';
    }

    // ignoredBranches
    const ignoredBranches = configProperties.ignoredBranches;
    if (isSchemaObject(ignoredBranches)) {
      ignoredBranches.minItems = 0;
      ignoredBranches.description =
        ignoredBranches.description ??
        'Branch names or patterns that should bypass linting (e.g. "main", "release/*").';
      // keep items simple: strings
      ignoredBranches.items = { type: 'string' };
      // If you keep BranchIgnorePattern, just give it a generic description
      const ignorePatternDefinition = definitions.BranchIgnorePattern;
      if (isSchemaObject(ignorePatternDefinition)) {
        ignorePatternDefinition.description = 'Branch names or patterns that should bypass linting.';
      }
    }

    // defaults
    const extraQuestions = configProperties.extraQuestions;
    if (isSchemaObject(extraQuestions)) {
      extraQuestions.default = {
        baseBranch: false,
        checkout: false,
        pushToRemote: false,
      };
    }

    const showCliTips = configProperties.showCliTips;
    if (isSchemaObject(showCliTips)) {
      showCliTips.default = true;
    }

    // deprecated fields -> boolean deprecated + description message
    const ticketIdPrompt = configProperties.ticketIdPrompt;
    if (isSchemaObject(ticketIdPrompt)) {
      /** @type {Record<string, unknown>} */ (ticketIdPrompt).deprecated = true;
      ticketIdPrompt.description = 'Ticket ID prompt mode. Deprecated: use rules.ticketId instead.';
    }

    const ticketIdPrefix = configProperties.ticketIdPrefix;
    if (isSchemaObject(ticketIdPrefix)) {
      /** @type {Record<string, unknown>} */ (ticketIdPrefix).deprecated = true;
      ticketIdPrefix.description = 'Ticket ID prefix. Deprecated: use rules.ticketId options.prefix instead.';
    }

    // Example
    configDefinition.examples = [
      {
        branchTypes: [
          { name: 'feat', label: 'Feature' },
          { name: 'fix', label: 'Bug Fix' },
          { name: 'chore', label: 'Chore' },
        ],
        maxDescriptionLength: 24,
        ignoredBranches: ['main', 'develop', 'release/*'],
        descriptionStyle: 'kebab-case',
        template: '{{type}}/{{desc}}',
        presets: ['recommended'],
        rules: {
          ticketId: ['optional', { prefix: 'NPXR-' }],
        },
        extraQuestions: {
          checkout: false,
          baseBranch: false,
          pushToRemote: false,
        },
        showCliTips: true,
      },
    ];
  }

  //
  // Normalize rule-related definitions.
  //
  const rulesDefinition = isSchemaObject(definitions.Rules) ? definitions.Rules : undefined;

  if (rulesDefinition) {
    // 1) Ensure RuleSeverity exists (ts-json-schema-generator should have made it)
    const ruleSeverity = definitions.RuleSeverity;
    if (isSchemaObject(ruleSeverity)) {
      ruleSeverity.description = ruleSeverity.description ?? 'Rule severity: off, optional, or required.';
    }

    // 2) TicketIdRuleOptions is already generated; just tweak description
    const ticketIdOptions = isSchemaObject(definitions.TicketIdRuleOptions)
      ? definitions.TicketIdRuleOptions
      : undefined;
    if (ticketIdOptions?.properties?.prefix) {
      const prefixDefinition = /** @type {JSONSchema | undefined} */ (ticketIdOptions.properties.prefix);
      if (isSchemaObject(prefixDefinition)) {
        prefixDefinition.description = 'Ticket ID prefix, e.g. "NPXR-".';
      }
    }

    // 3) Replace the generic-ish stuff with cleaned-up, named defs

    // TicketIdRuleConfig
    definitions.TicketIdRuleConfig = {
      description: 'Rule configuration for the built-in ticketId rule.',
      anyOf: [
        { type: 'boolean' },
        { $ref: '#/definitions/RuleSeverity' },
        {
          type: 'array',
          minItems: 2,
          maxItems: 2,
          items: [{ $ref: '#/definitions/RuleSeverity' }, { $ref: '#/definitions/TicketIdRuleOptions' }],
        },
        {
          type: 'object',
          properties: {
            severity: { $ref: '#/definitions/RuleSeverity' },
            options: { $ref: '#/definitions/TicketIdRuleOptions' },
          },
          required: ['severity'],
          additionalProperties: false,
        },
      ],
    };

    // GenericRuleConfig
    definitions.GenericRuleConfig = {
      description: 'Rule configuration for any other rule.',
      anyOf: [
        { type: 'boolean' },
        { $ref: '#/definitions/RuleSeverity' },
        {
          type: 'array',
          minItems: 2,
          maxItems: 2,
          items: [{ $ref: '#/definitions/RuleSeverity' }, {}],
        },
        {
          type: 'object',
          properties: {
            severity: { $ref: '#/definitions/RuleSeverity' },
            options: {},
          },
          required: ['severity'],
          additionalProperties: false,
        },
      ],
    };

    // Wire Rules.ticketId and Rules.additionalProperties to the new defs
    if (rulesDefinition.properties) {
      const ruleProperties = /** @type {Record<string, JSONSchema | undefined>} */ (rulesDefinition.properties);
      if (ruleProperties.ticketId) {
        ruleProperties.ticketId = {
          $ref: '#/definitions/TicketIdRuleConfig',
        };
      }
    }
    rulesDefinition.additionalProperties = {
      $ref: '#/definitions/GenericRuleConfig',
    };

    // Optional: delete the ugly generator artifacts if they exist
    delete definitions['RuleConfig<TicketIdRuleOptions>'];
    delete definitions['NormalizedRuleConfig<TicketIdRuleOptions>'];
    delete definitions['RuleConfig<any>'];
    delete definitions['NormalizedRuleConfig<any>'];
  }

  return result;
}

/**
 * Determines whether a schema definition is an object schema (and not a boolean shorthand).
 * @param {JSONSchema | undefined} value Schema definition to inspect.
 * @returns {value is JSONSchema}
 */
function isSchemaObject(value) {
  return typeof value === 'object' && value !== null;
}

/**
 * Guarantees that a schema definition represents an array by setting a type when missing.
 * @param {JSONSchema} value Schema definition to mutate.
 * @returns {void}
 */
function ensureArray(value) {
  if (!value) {
    return;
  }
  if (!value.type) {
    value.type = 'array';
  }
}

/**
 * Writes the provided JSON schema to disk with pretty-printing.
 * @param {string} filePath Absolute destination path.
 * @param {JSONSchema} contents Schema object to serialise.
 * @returns {Promise<void>}
 */
async function writeJson(filePath, contents) {
  const json = JSON.stringify(contents, null, 2);
  await writeFile(filePath, `${json}\n`, 'utf8');
}
