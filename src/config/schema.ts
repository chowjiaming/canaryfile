import { parse as parseYaml } from "yaml";
import { z } from "zod";

function parseDuration(raw: string): number {
  const value = Number(raw.slice(0, -1));
  const unit = raw.slice(-1);
  return unit === "m" ? value * 60_000 : value * 1000;
}

const durationSchema = z.string().regex(/^\d+(s|m)$/);

const verifyStepSchema = z
  .strictObject({
    run: z.string().min(1),
  })
  .transform((step) => step.run);

const taskSchema = z.strictObject({
  name: z.string().regex(/^[a-z0-9-]+$/),
  prompt: z.string().min(1),
  setup: z.string().nullable().optional().default(null),
  verify: z.array(verifyStepSchema).min(1).max(10),
  services: z.array(z.string()).optional().default([]),
  runs: z.number().int().min(1).max(25).nullable().optional().default(null),
  budget: z.number().nonnegative().nullable().optional().default(null),
  tags: z.array(z.string()).optional().default([]),
});

const serviceSchema = z.strictObject({
  start: z.string(),
  ready: z.string(),
  stop: z.string().nullable().optional().default(null),
});

const canaryfileSchema = z
  .strictObject({
    version: z.literal(1),
    agent: z
      .strictObject({
        adapter: z.enum(["claude-code", "codex", "custom"]),
        model: z.string().optional().default("default"),
        timeout: durationSchema.optional().default("300s"),
        command: z.string().nullable().optional().default(null),
      })
      .transform((agent) => ({
        adapter: agent.adapter,
        model: agent.model,
        timeoutMs: parseDuration(agent.timeout),
        command: agent.command,
      })),
    defaults: z
      .strictObject({
        runs: z.number().int().min(1).max(25).optional().default(5),
        budget: z.number().nonnegative().optional().default(0.5),
      })
      .optional()
      .default({ runs: 5, budget: 0.5 }),
    stats: z
      .strictObject({
        slack: z.number().optional().default(0.1),
        costMultiplier: z.number().optional().default(1.5),
      })
      .optional()
      .default({ slack: 0.1, costMultiplier: 1.5 }),
    tasks: z.array(taskSchema).min(1),
    services: z.record(z.string(), serviceSchema).optional().default({}),
  })
  .superRefine((config, ctx) => {
    const names = new Set<string>();
    for (const task of config.tasks) {
      if (names.has(task.name)) {
        ctx.addIssue({
          code: "custom",
          message: `task names must be unique: ${task.name}`,
          path: ["tasks"],
        });
      }
      names.add(task.name);
    }
  });

export type CanaryfileConfig = z.infer<typeof canaryfileSchema>;

function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "config";
      return `${path}: ${issue.message}`;
    })
    .join("\n");
}

export function parseCanaryfile(source: string): CanaryfileConfig {
  let raw: unknown;
  try {
    raw = parseYaml(source);
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid yaml";
    throw new Error(`canaryfile.yaml: ${message}`);
  }

  const result = canaryfileSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`canaryfile.yaml:\n${formatZodError(result.error)}`);
  }

  return result.data;
}
