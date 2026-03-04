import { XMLParser } from "fast-xml-parser";
import { v4 as uuid } from "uuid";
import type { WorkoutStep } from "@/types/workout";

interface ZwoRoot {
  workout_file: {
    name?: string;
    description?: string;
    workout: ZwoWorkout;
  };
}

interface ZwoWorkout {
  Warmup?: ZwoBlock | ZwoBlock[];
  Cooldown?: ZwoBlock | ZwoBlock[];
  SteadyState?: ZwoBlock | ZwoBlock[];
  IntervalsT?: ZwoIntervalBlock | ZwoIntervalBlock[];
  Ramp?: ZwoBlock | ZwoBlock[];
  FreeRide?: ZwoBlock | ZwoBlock[];
}

interface ZwoBlock {
  "@_Duration": number;
  "@_Power"?: number;
  "@_PowerLow"?: number;
  "@_PowerHigh"?: number;
}

interface ZwoIntervalBlock {
  "@_Repeat": number;
  "@_OnDuration": number;
  "@_OffDuration": number;
  "@_OnPower": number;
  "@_OffPower": number;
}

function asArray<T>(v: T | T[] | undefined): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export interface ParsedZwo {
  name: string;
  description: string;
  steps: WorkoutStep[];
}

export function parseZwo(xmlText: string): ParsedZwo {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  const raw = parser.parse(xmlText) as ZwoRoot;
  const wf = raw.workout_file;
  const w = wf.workout;

  const steps: WorkoutStep[] = [];

  // Collect all blocks with their original order from the raw XML
  // fast-xml-parser loses element order, so we re-parse with preserveOrder
  const orderedParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    preserveOrder: true,
  });
  const ordered = orderedParser.parse(xmlText) as unknown[];

  // Walk the ordered tree to extract blocks in document order
  function walk(nodes: unknown[]): void {
    for (const node of nodes) {
      if (typeof node !== "object" || node === null) continue;
      const obj = node as Record<string, unknown>;

      for (const tag of Object.keys(obj)) {
        if (tag === ":@" || tag === "#text") continue;
        const children = obj[tag];
        const attrs = (obj[":@"] ?? {}) as Record<string, number>;

        switch (tag) {
          case "Warmup":
          case "Cooldown":
            steps.push({
              id: uuid(),
              type: tag.toLowerCase() as "warmup" | "cooldown",
              durationSeconds: attrs["@_Duration"] ?? 300,
              powerPercent: attrs["@_PowerLow"] ?? attrs["@_Power"] ?? 0.5,
              powerPercentEnd: attrs["@_PowerHigh"],
            });
            break;
          case "SteadyState":
            steps.push({
              id: uuid(),
              type: "steady",
              durationSeconds: attrs["@_Duration"] ?? 300,
              powerPercent: attrs["@_Power"] ?? 0.75,
            });
            break;
          case "IntervalsT":
            steps.push({
              id: uuid(),
              type: "interval",
              durationSeconds: attrs["@_OnDuration"] ?? 300,
              powerPercent: attrs["@_OnPower"] ?? 1.0,
              repeat: attrs["@_Repeat"] ?? 1,
              offDurationSeconds: attrs["@_OffDuration"] ?? 120,
              offPowerPercent: attrs["@_OffPower"] ?? 0.5,
            });
            break;
          case "Ramp":
            steps.push({
              id: uuid(),
              type: "ramp",
              durationSeconds: attrs["@_Duration"] ?? 300,
              powerPercent: attrs["@_PowerLow"] ?? 0.5,
              powerPercentEnd: attrs["@_PowerHigh"] ?? 1.0,
            });
            break;
          case "FreeRide":
            steps.push({
              id: uuid(),
              type: "free",
              durationSeconds: attrs["@_Duration"] ?? 300,
              powerPercent: 0.6,
            });
            break;
          default:
            if (Array.isArray(children)) walk(children);
        }
      }
    }
  }

  walk(ordered);

  // Fallback: if walk got nothing, parse without order
  if (steps.length === 0) {
    const addBlocks = (
      tag: string,
      blocks: ZwoBlock | ZwoBlock[] | undefined,
      type: WorkoutStep["type"]
    ) => {
      for (const b of asArray(blocks)) {
        steps.push({
          id: uuid(),
          type,
          durationSeconds: b["@_Duration"] ?? 300,
          powerPercent: b["@_PowerLow"] ?? b["@_Power"] ?? 0.5,
          powerPercentEnd: b["@_PowerHigh"],
        });
      }
    };
    addBlocks("Warmup", w.Warmup, "warmup");
    addBlocks("SteadyState", w.SteadyState, "steady");
    for (const b of asArray(w.IntervalsT)) {
      steps.push({
        id: uuid(),
        type: "interval",
        durationSeconds: b["@_OnDuration"] ?? 300,
        powerPercent: b["@_OnPower"] ?? 1.0,
        repeat: b["@_Repeat"] ?? 1,
        offDurationSeconds: b["@_OffDuration"] ?? 120,
        offPowerPercent: b["@_OffPower"] ?? 0.5,
      });
    }
    addBlocks("Ramp", w.Ramp, "ramp");
    addBlocks("Cooldown", w.Cooldown, "cooldown");
    addBlocks("FreeRide", w.FreeRide, "free");
  }

  return {
    name: (wf.name as string | undefined) ?? "Workout importato",
    description: (wf.description as string | undefined) ?? "",
    steps,
  };
}
