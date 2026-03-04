/**
 * FTMS (Fitness Machine Service) Web Bluetooth client
 *
 * Service:        0x1826  Fitness Machine Service
 * Characteristics:
 *   0x2ACC  FTM Feature          (read)
 *   0x2AD2  Indoor Bike Data     (notify) — power, cadence, speed
 *   0x2AD9  Control Point        (write with response) — ERG commands
 *
 * This file is CLIENT-SIDE ONLY — must be used inside "use client" components.
 */

import type { BikeData } from "@/types/workout";

const FTMS_SERVICE     = 0x1826;
const CHAR_BIKE_DATA   = 0x2ad2;
const CHAR_CTRL_POINT  = 0x2ad9;

// Control Point OpCodes
const OP_REQUEST_CONTROL  = 0x00;
const OP_START_RESUME     = 0x07;
const OP_STOP_PAUSE       = 0x08;
const OP_SET_TARGET_POWER = 0x05;

type DataCallback = (data: BikeData) => void;
type DisconnectCallback = () => void;

export class FTMSClient {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private ctrlChar: BluetoothRemoteGATTCharacteristic | null = null;
  private bikeDataChar: BluetoothRemoteGATTCharacteristic | null = null;
  private _connected = false;

  private dataCallback: DataCallback | null = null;
  private disconnectCallback: DisconnectCallback | null = null;

  get connected(): boolean { return this._connected; }
  get deviceName(): string { return this.device?.name ?? "Rullo sconosciuto"; }

  async connect(): Promise<void> {
    if (!navigator.bluetooth) {
      throw new Error("Web Bluetooth non supportato in questo browser. Usa Chrome o Edge.");
    }

    this.device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [FTMS_SERVICE] }],
      optionalServices: [FTMS_SERVICE],
    });

    this.device.addEventListener("gattserverdisconnected", () => {
      this._connected = false;
      this.disconnectCallback?.();
    });

    this.server = await this.device.gatt!.connect();

    const service = await this.server.getPrimaryService(FTMS_SERVICE);

    this.bikeDataChar = await service.getCharacteristic(CHAR_BIKE_DATA);
    this.ctrlChar     = await service.getCharacteristic(CHAR_CTRL_POINT);

    // Subscribe to bike data notifications
    await this.bikeDataChar.startNotifications();
    this.bikeDataChar.addEventListener(
      "characteristicvaluechanged",
      (event: Event) => {
        const char = event.target as BluetoothRemoteGATTCharacteristic;
        const data = this.parseBikeData(char.value!);
        this.dataCallback?.(data);
      }
    );

    // Request control of the trainer
    await this.writeCtrl(new Uint8Array([OP_REQUEST_CONTROL]));
    this._connected = true;
  }

  async disconnect(): Promise<void> {
    if (this.bikeDataChar) {
      try { await this.bikeDataChar.stopNotifications(); } catch {}
    }
    if (this.server?.connected) {
      this.server.disconnect();
    }
    this._connected = false;
  }

  onData(cb: DataCallback): void { this.dataCallback = cb; }
  onDisconnect(cb: DisconnectCallback): void { this.disconnectCallback = cb; }

  async start(): Promise<void> {
    await this.writeCtrl(new Uint8Array([OP_START_RESUME]));
  }

  async stop(): Promise<void> {
    await this.writeCtrl(new Uint8Array([OP_STOP_PAUSE, 0x01]));
  }

  /**
   * Set target power in ERG mode.
   * @param watts Target power in watts (positive integer)
   */
  async setTargetPower(watts: number): Promise<void> {
    const w = Math.max(0, Math.round(watts));
    const buf = new Uint8Array(3);
    buf[0] = OP_SET_TARGET_POWER;
    // Int16LE
    buf[1] = w & 0xff;
    buf[2] = (w >> 8) & 0xff;
    await this.writeCtrl(buf);
  }

  private async writeCtrl(data: Uint8Array): Promise<void> {
    if (!this.ctrlChar) throw new Error("Rullo non connesso");
    await this.ctrlChar.writeValueWithResponse(data.buffer as ArrayBuffer);
  }

  /**
   * Parse Indoor Bike Data characteristic (0x2AD2).
   * Flag bits determine which fields are present.
   * Typical layout for most trainers (Tacx, Wahoo, Garmin):
   *   [0-1] Flags uint16
   *   [2-3] Instantaneous Speed uint16 (/100 km/h) — if bit 0 = 0 (always present)
   *   [4-5] Instantaneous Cadence uint16 (/2 rpm) — if bit 2 = 1
   *   [6-7] Instantaneous Power int16 (watts) — if bit 6 = 1
   */
  private parseBikeData(view: DataView): BikeData {
    const flags = view.getUint16(0, true);
    let offset = 2;

    const speedPresent    = true; // always present (bit 0 = 0 means "more data")
    const cadencePresent  = (flags >> 2) & 1;
    const powerPresent    = (flags >> 6) & 1;

    let speed = 0;
    let cadence = 0;
    let instantPower = 0;

    if (speedPresent && view.byteLength > offset + 1) {
      speed = view.getUint16(offset, true) / 100;
      offset += 2;
    }
    // Average speed (bit 1) — skip if present
    if ((flags >> 1) & 1) offset += 2;

    if (cadencePresent && view.byteLength > offset + 1) {
      cadence = view.getUint16(offset, true) / 2;
      offset += 2;
    }
    // Average cadence (bit 3) — skip if present
    if ((flags >> 3) & 1) offset += 2;
    // Total distance (bit 4) — skip if present (3 bytes)
    if ((flags >> 4) & 1) offset += 3;
    // Resistance level (bit 5) — skip if present
    if ((flags >> 5) & 1) offset += 2;

    if (powerPresent && view.byteLength > offset + 1) {
      instantPower = view.getInt16(offset, true);
      offset += 2;
    }

    return { instantPower, cadence, speed };
  }
}
