/**
 * Basic FIT file parser for cycling data.
 * Parses binary FIT protocol used by Garmin, Wahoo, etc.
 *
 * FIT file structure:
 * - 14-byte header
 * - Data records (definition + data messages)
 * - 2-byte CRC
 */

interface ParsedFitData {
  startTime: Date;
  duration: number;
  totalDistance: number;
  elevationGain: number;
  calories: number;
  timestamp: number[];
  power: number[];
  heartRate: number[];
  cadence: number[];
  speed: number[];
  altitude: number[];
  distance: number[];
  lat: number[];
  lng: number[];
}

// FIT base types
const FIT_EPOCH = 631065600; // seconds from Unix epoch to FIT epoch (1989-12-31)

// Global Message Numbers
const MESG_NUM_SESSION = 18;
const MESG_NUM_RECORD = 20;

// Field definitions for Record message (mesg_num = 20)
const RECORD_FIELD_TIMESTAMP = 253;
const RECORD_FIELD_LATITUDE = 0;
const RECORD_FIELD_LONGITUDE = 1;
const RECORD_FIELD_ALTITUDE = 2;
const RECORD_FIELD_HEART_RATE = 3;
const RECORD_FIELD_CADENCE = 4;
const RECORD_FIELD_DISTANCE = 5;
const RECORD_FIELD_SPEED = 6;
const RECORD_FIELD_POWER = 7;

// Session fields
const SESSION_FIELD_TOTAL_ELAPSED_TIME = 7;
const SESSION_FIELD_TOTAL_DISTANCE = 9;
const SESSION_FIELD_TOTAL_CALORIES = 11;
const SESSION_FIELD_TOTAL_ASCENT = 22;
const SESSION_FIELD_START_TIME = 2;

interface FieldDef {
  fieldNum: number;
  size: number;
  baseType: number;
}

interface MesgDef {
  architecture: number; // 0 = little endian, 1 = big endian
  globalMesgNum: number;
  numFields: number;
  fields: FieldDef[];
  devDataSize: number; // total bytes of developer data in each data message
}

export function parseFitFile(buffer: Buffer): ParsedFitData {
  const result: ParsedFitData = {
    startTime: new Date(),
    duration: 0,
    totalDistance: 0,
    elevationGain: 0,
    calories: 0,
    timestamp: [],
    power: [],
    heartRate: [],
    cadence: [],
    speed: [],
    altitude: [],
    distance: [],
    lat: [],
    lng: [],
  };

  // Validate FIT header
  if (buffer.length < 14) {
    throw new Error("File troppo piccolo per essere un file FIT valido");
  }

  const headerSize = buffer[0];
  const dataSize = buffer.readUInt32LE(4);

  // Check ".FIT" signature
  if (headerSize >= 14) {
    const sig = buffer.toString("ascii", 8, 12);
    if (sig !== ".FIT") {
      throw new Error("Firma .FIT non trovata - file non valido");
    }
  }

  let offset = headerSize;
  const endOffset = headerSize + dataSize;
  const definitions: Map<number, MesgDef> = new Map();

  while (offset < endOffset && offset < buffer.length - 1) {
    const recordHeader = buffer[offset];
    offset++;

    const isDefinition = (recordHeader & 0x40) !== 0;
    const localMesgType = recordHeader & 0x0f;
    const isCompressedTimestamp = (recordHeader & 0x80) !== 0;

    if (isCompressedTimestamp) {
      // Compressed timestamp header format: 1 LL TTTTT
      // Bits 6-5 = local message type (NOT bits 3-0)
      // Bits 4-0 = time offset
      const compressedLocalType = (recordHeader >> 5) & 0x03;
      const def = definitions.get(compressedLocalType);
      if (def) {
        offset = readDataMessage(buffer, offset, def, result);
      } else {
        // Can't find definition → skip message body to avoid misalignment
        // Calculate expected message size from any record definition
        let msgSize = 0;
        definitions.forEach((d) => {
          if (msgSize === 0 && d.globalMesgNum === MESG_NUM_RECORD) {
            msgSize = d.fields.reduce((sum, f) => sum + f.size, 0);
          }
        });
        if (msgSize > 0) {
          offset += msgSize;
        } else {
          break; // Can't recover
        }
      }
      continue;
    }

    if (isDefinition) {
      // Definition message
      offset++; // reserved byte
      const architecture = buffer[offset];
      offset++;
      const globalMesgNum =
        architecture === 0
          ? buffer.readUInt16LE(offset)
          : buffer.readUInt16BE(offset);
      offset += 2;
      const numFields = buffer[offset];
      offset++;

      const fields: FieldDef[] = [];
      for (let i = 0; i < numFields; i++) {
        if (offset + 3 > buffer.length) break;
        fields.push({
          fieldNum: buffer[offset],
          size: buffer[offset + 1],
          baseType: buffer[offset + 2],
        });
        offset += 3;
      }

      // Handle developer fields if present (FIT Protocol 2.x)
      // Read their sizes so we can skip dev data bytes in data messages
      let devDataSize = 0;
      if ((recordHeader & 0x20) !== 0) {
        if (offset < buffer.length) {
          const numDevFields = buffer[offset];
          offset++;
          for (let i = 0; i < numDevFields; i++) {
            if (offset + 3 > buffer.length) break;
            devDataSize += buffer[offset + 1]; // byte 1 = size of this dev field
            offset += 3;
          }
        }
      }

      definitions.set(localMesgType, {
        architecture,
        globalMesgNum,
        numFields,
        fields,
        devDataSize,
      });
    } else {
      // Data message
      const def = definitions.get(localMesgType);
      if (!def) {
        // Skip unknown message - can't determine size without definition
        break;
      }
      offset = readDataMessage(buffer, offset, def, result);
    }
  }

  console.log(`[FIT] Parsed ${result.timestamp.length} records, power: ${result.power.filter(p => p > 0).length} non-zero, duration: ${result.duration}s, distance: ${result.totalDistance}m`);

  // Calculate elevation gain from altitude data
  if (result.altitude.length > 1) {
    let gain = 0;
    for (let i = 1; i < result.altitude.length; i++) {
      const diff = result.altitude[i] - result.altitude[i - 1];
      if (diff > 0 && diff < 50) {
        gain += diff;
      }
    }
    if (result.elevationGain === 0) {
      result.elevationGain = Math.round(gain);
    }
  }

  // Set duration from timestamps if not from session
  if (result.duration === 0 && result.timestamp.length > 1) {
    result.duration =
      result.timestamp[result.timestamp.length - 1] - result.timestamp[0];
  }

  // Set total distance from distance stream if not from session
  if (result.totalDistance === 0 && result.distance.length > 0) {
    result.totalDistance = result.distance[result.distance.length - 1];
  }

  return result;
}

function readDataMessage(
  buffer: Buffer,
  offset: number,
  def: MesgDef,
  result: ParsedFitData
): number {
  const isRecord = def.globalMesgNum === MESG_NUM_RECORD;
  const isSession = def.globalMesgNum === MESG_NUM_SESSION;

  let recordPower = 0;
  let recordHR = 0;
  let recordCadence = 0;
  let recordSpeed = 0;
  let recordAltitude = 0;
  let recordDistance = 0;
  let recordLat = 0;
  let recordLng = 0;
  let recordTimestamp = 0;
  let hasRecord = false;

  for (const field of def.fields) {
    if (offset + field.size > buffer.length) {
      offset = buffer.length;
      return offset;
    }

    const value = readFieldValue(buffer, offset, field, def.architecture);
    offset += field.size;

    if (isRecord) {
      hasRecord = true;
      switch (field.fieldNum) {
        case RECORD_FIELD_TIMESTAMP:
          recordTimestamp = (value as number) + FIT_EPOCH;
          break;
        case RECORD_FIELD_POWER:
          recordPower = value as number;
          break;
        case RECORD_FIELD_HEART_RATE:
          recordHR = value as number;
          break;
        case RECORD_FIELD_CADENCE:
          recordCadence = value as number;
          break;
        case RECORD_FIELD_SPEED:
          recordSpeed = ((value as number) / 1000) * 3.6; // mm/s to km/h
          break;
        case RECORD_FIELD_ALTITUDE:
          recordAltitude = (value as number) / 5 - 500; // FIT altitude encoding
          break;
        case RECORD_FIELD_DISTANCE:
          recordDistance = (value as number) / 100; // cm to m
          break;
        case RECORD_FIELD_LATITUDE:
          recordLat = ((value as number) * 180) / 2147483648; // semicircles to degrees
          break;
        case RECORD_FIELD_LONGITUDE:
          recordLng = ((value as number) * 180) / 2147483648;
          break;
      }
    }

    if (isSession) {
      switch (field.fieldNum) {
        case SESSION_FIELD_TOTAL_ELAPSED_TIME:
          result.duration = Math.round((value as number) / 1000); // ms to s
          break;
        case SESSION_FIELD_TOTAL_DISTANCE:
          result.totalDistance = Math.round((value as number) / 100); // cm to m
          break;
        case SESSION_FIELD_TOTAL_CALORIES:
          result.calories = value as number;
          break;
        case SESSION_FIELD_TOTAL_ASCENT:
          result.elevationGain = value as number;
          break;
        case SESSION_FIELD_START_TIME: {
          const ts = (value as number) + FIT_EPOCH;
          result.startTime = new Date(ts * 1000);
          break;
        }
      }
    }
  }

  // Skip developer data bytes (FIT Protocol 2.x) to keep offset aligned
  if (def.devDataSize > 0) {
    offset += def.devDataSize;
  }

  if (isRecord && hasRecord) {
    result.timestamp.push(recordTimestamp);
    result.power.push(recordPower || 0);
    result.heartRate.push(recordHR || 0);
    result.cadence.push(recordCadence || 0);
    result.speed.push(recordSpeed || 0);
    result.altitude.push(recordAltitude || 0);
    result.distance.push(recordDistance || 0);
    result.lat.push(recordLat || 0);
    result.lng.push(recordLng || 0);
  }

  return offset;
}

function readFieldValue(
  buffer: Buffer,
  offset: number,
  field: FieldDef,
  architecture: number
): number {
  const baseType = field.baseType & 0x1f;
  const isLE = architecture === 0;

  switch (baseType) {
    case 0: // enum (uint8)
    case 2: // uint8
    case 10: // uint8z
      return buffer[offset];
    case 1: // sint8
      return buffer.readInt8(offset);
    case 3: // sint16
      return isLE
        ? buffer.readInt16LE(offset)
        : buffer.readInt16BE(offset);
    case 4: // uint16
    case 11: // uint16z
      return isLE
        ? buffer.readUInt16LE(offset)
        : buffer.readUInt16BE(offset);
    case 5: // sint32
      return isLE
        ? buffer.readInt32LE(offset)
        : buffer.readInt32BE(offset);
    case 6: // uint32
    case 12: // uint32z
    case 134: // uint32
      return isLE
        ? buffer.readUInt32LE(offset)
        : buffer.readUInt32BE(offset);
    case 8: // float32
      return isLE
        ? buffer.readFloatLE(offset)
        : buffer.readFloatBE(offset);
    case 9: // float64
      return isLE
        ? buffer.readDoubleLE(offset)
        : buffer.readDoubleBE(offset);
    default:
      // For strings and unknown types, return first byte
      return buffer[offset] || 0;
  }
}
