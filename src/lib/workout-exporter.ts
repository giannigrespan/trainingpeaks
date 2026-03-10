import { expandSteps } from "./workout-utils";
import type { Workout, WorkoutStep } from "@/types/workout";

/* ─── FIT Course (GPS track → Wahoo ELEMNT navigation) ────────── */

const FIT_EPOCH = 631065600; // seconds between Unix epoch and FIT epoch

// FIT CRC-16 algorithm (from official Garmin FIT SDK)
const FIT_CRC_TABLE = [
  0x0000, 0xcc01, 0xd801, 0x1400, 0xf001, 0x3c00, 0x2800, 0xe401,
  0xa001, 0x6c00, 0x7800, 0xb401, 0x5000, 0x9c01, 0x8801, 0x4400,
];
function fitCRC(buf: Buffer): number {
  let crc = 0;
  for (let i = 0; i < buf.length; i++) {
    const byte = buf[i];
    let tmp = FIT_CRC_TABLE[crc & 0xf];
    crc = (crc >> 4) & 0x0fff;
    crc ^= tmp ^ FIT_CRC_TABLE[byte & 0xf];
    tmp = FIT_CRC_TABLE[crc & 0xf];
    crc = (crc >> 4) & 0x0fff;
    crc ^= tmp ^ FIT_CRC_TABLE[(byte >> 4) & 0xf];
  }
  return crc;
}

/** Build a FIT definition message (little-endian). */
function fitDefMsg(
  localNum: number,
  globalMesgNum: number,
  fields: Array<{ f: number; s: number; t: number }>
): Buffer {
  const b = Buffer.alloc(6 + fields.length * 3);
  b[0] = 0x40 | (localNum & 0x0f); // definition record header
  b[1] = 0;                         // reserved
  b[2] = 0;                         // little-endian
  b.writeUInt16LE(globalMesgNum, 3);
  b[5] = fields.length;
  fields.forEach(({ f, s, t }, i) => {
    b[6 + i * 3] = f;
    b[7 + i * 3] = s;
    b[8 + i * 3] = t;
  });
  return b;
}

/**
 * Export a GPS track as a FIT course file (.fit) suitable for Wahoo ELEMNT navigation.
 * The user loads this file via the Wahoo companion app to get turn-by-turn route guidance.
 *
 * @param lat       Array of latitudes (degrees)
 * @param lng       Array of longitudes (degrees)
 * @param altitude  Array of altitudes (meters)
 * @param distance  Array of cumulative distances (meters)
 * @param timestamps Array of Unix timestamps (seconds)
 * @param name      Course name (max 15 chars)
 */
export function exportToFitCourse(
  lat: number[],
  lng: number[],
  altitude: number[],
  distance: number[],
  timestamps: number[],
  name: string
): Buffer {
  const n = Math.min(lat.length, lng.length);

  // Filter out invalid GPS points (no fix, out of range, NaN)
  const pts: Array<{ lat: number; lng: number; alt: number; dist: number; ts: number }> = [];
  for (let i = 0; i < n; i++) {
    const la = lat[i], lo = lng[i];
    if (isNaN(la) || isNaN(lo) || (la === 0 && lo === 0) || la < -90 || la > 90 || lo < -180 || lo > 180) continue;
    pts.push({ lat: la, lng: lo, alt: altitude[i] ?? 0, dist: distance[i] ?? 0, ts: timestamps[i] ?? 0 });
  }
  if (pts.length === 0) throw new Error("Nessun punto GPS valido per generare il percorso");

  const safeName = name.slice(0, 15);
  const parts: Buffer[] = [];

  // ── Local 0: file_id (mesg_num=0) ──
  // Fields: type(0,enum/uint8), manufacturer(1,uint16)
  parts.push(fitDefMsg(0, 0, [{ f: 0, s: 1, t: 0x00 }, { f: 1, s: 2, t: 0x84 }]));
  {
    const b = Buffer.alloc(4); // 1 header + 1 type + 2 manufacturer
    b[0] = 0x00;
    b[1] = 6;                      // type = course
    b.writeUInt16LE(255, 2);       // manufacturer = development
    parts.push(b);
  }

  // ── Local 1: course (mesg_num=31) ──
  // Fields: name(4,string,16), sport(5,enum,1)
  parts.push(fitDefMsg(1, 31, [{ f: 4, s: 16, t: 0x07 }, { f: 5, s: 1, t: 0x00 }]));
  {
    const b = Buffer.alloc(18); // 1 header + 16 name + 1 sport
    b[0] = 0x01;
    // name: 16 bytes, null-padded (last byte is always 0x00)
    b.write(safeName, 1, "utf8");
    b[17] = 2; // sport = cycling
    parts.push(b);
  }

  // ── Local 2: record (mesg_num=20) — GPS track points ──
  // Fields: timestamp(253,uint32), lat(0,sint32), lng(1,sint32), altitude(2,uint16), distance(5,uint32)
  parts.push(fitDefMsg(2, 20, [
    { f: 253, s: 4, t: 0x86 }, // timestamp  uint32
    { f: 0,   s: 4, t: 0x85 }, // lat        sint32 (semicircles)
    { f: 1,   s: 4, t: 0x85 }, // lng        sint32 (semicircles)
    { f: 2,   s: 2, t: 0x84 }, // altitude   uint16 (FIT encoded)
    { f: 5,   s: 4, t: 0x86 }, // distance   uint32 (cm)
  ]));

  for (const pt of pts) {
    const b = Buffer.alloc(19); // 1 header + 4+4+4+2+4
    let off = 0;
    b[off++] = 0x02; // data, local 2
    const fitTs = Math.max(0, Math.round(pt.ts) - FIT_EPOCH);
    b.writeUInt32LE(fitTs, off); off += 4;
    // Degrees → semicircles: multiply by 2^31 / 180
    b.writeInt32LE(Math.round((pt.lat * 2147483648) / 180), off); off += 4;
    b.writeInt32LE(Math.round((pt.lng * 2147483648) / 180), off); off += 4;
    // Altitude: (m + 500) * 5, clamped to uint16 range
    const altEncoded = Math.max(0, Math.min(65535, Math.round((pt.alt + 500) * 5)));
    b.writeUInt16LE(altEncoded, off); off += 2;
    // Distance: meters → centimeters
    b.writeUInt32LE(Math.round(pt.dist * 100), off);
    parts.push(b);
  }

  // ── Assemble data section ──
  const data = Buffer.concat(parts);

  // ── 14-byte header ──
  const header = Buffer.alloc(14);
  header[0] = 14;                         // header size
  header[1] = 0x10;                       // protocol version
  header.writeUInt16LE(0x071c, 2);        // profile version
  header.writeUInt32LE(data.length, 4);   // data size
  header.write(".FIT", 8, "ascii");
  header.writeUInt16LE(fitCRC(header.slice(0, 12)), 12);

  // ── File CRC ──
  const crcBuf = Buffer.alloc(2);
  crcBuf.writeUInt16LE(fitCRC(data), 0);

  return Buffer.concat([header, data, crcBuf]);
}

/* ─── ZWO (Zwift XML) ─────────────────────────────────────────── */

function stepToZwo(step: WorkoutStep): string {
  const d = step.durationSeconds;
  const p = step.powerPercent.toFixed(3);
  const pEnd = (step.powerPercentEnd ?? step.powerPercent).toFixed(3);

  switch (step.type) {
    case "warmup":
      return `    <Warmup Duration="${d}" PowerLow="${p}" PowerHigh="${pEnd}"/>`;
    case "cooldown":
      return `    <Cooldown Duration="${d}" PowerLow="${p}" PowerHigh="${pEnd}"/>`;
    case "ramp":
      return `    <Ramp Duration="${d}" PowerLow="${p}" PowerHigh="${pEnd}"/>`;
    case "interval":
      return [
        `    <IntervalsT`,
        `      Repeat="${step.repeat ?? 1}"`,
        `      OnDuration="${d}"`,
        `      OffDuration="${step.offDurationSeconds ?? 120}"`,
        `      OnPower="${p}"`,
        `      OffPower="${(step.offPowerPercent ?? 0.5).toFixed(3)}"/>`,
      ].join(" ");
    case "free":
      return `    <FreeRide Duration="${d}" FlatRoad="0"/>`;
    default:
      return `    <SteadyState Duration="${d}" Power="${p}"/>`;
  }
}

export function exportZwo(workout: Workout): string {
  const blocks = workout.steps.map(stepToZwo).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<workout_file>
  <author>CycloPower</author>
  <name>${escapeXml(workout.name)}</name>
  <description>${escapeXml(workout.description ?? "")}</description>
  <sportType>bike</sportType>
  <workout>
${blocks}
  </workout>
</workout_file>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* ─── MRC (TrainerRoad / ERG) ─────────────────────────────────── */

/**
 * Export to .mrc format using absolute watts.
 * Requires ftp to convert % → watts.
 */
export function exportMrc(workout: Workout, ftp: number): string {
  const expanded = expandSteps(workout.steps);
  const lines: string[] = [
    "[COURSE HEADER]",
    `DESCRIPTION = ${workout.name}`,
    `FILE NAME = ${workout.name.replace(/\s+/g, "_")}.mrc`,
    "MINUTES WATTS",
    "",
    "[COURSE DATA]",
  ];

  let currentMin = 0;

  for (const step of expanded) {
    const startMin = currentMin;
    const endMin = currentMin + step.durationSeconds / 60;

    const startW = Math.round(step.powerPercent * ftp);
    const endW = step.powerPercentEnd != null
      ? Math.round(step.powerPercentEnd * ftp)
      : startW;

    lines.push(`${startMin.toFixed(3)}\t${startW}`);
    if (endW !== startW) {
      lines.push(`${endMin.toFixed(3)}\t${endW}`);
    } else {
      lines.push(`${endMin.toFixed(3)}\t${endW}`);
    }
    currentMin = endMin;
  }

  lines.push("[END COURSE DATA]");
  return lines.join("\n");
}
