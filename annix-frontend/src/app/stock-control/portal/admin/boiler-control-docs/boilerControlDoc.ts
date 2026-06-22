export const BOILER_CONTROL_DOC_LAST_UPDATED = "2026-06-22";

export const BOILER_CONTROL_DOC = `> **Status: DRAFT — reconstructed from the offline controller program, not yet verified on the live plant.**
> This document was rebuilt from the LOGO!Soft Comfort circuit files left by the original engineer. The I/O list, sequence and alarms are recovered from the block labels and on-screen messages in those files. The exact wire-by-wire connections and the **numeric trip setpoints** must be confirmed against the program opened in LOGO!Soft Comfort (or on the panel) before this is treated as a controlled engineering record. Fields marked _(confirm)_ are placeholders.

## 1. System overview

The boiler is controlled by a **Siemens LOGO! 8** logic module (base unit plus analog expansion), reachable on the plant network at **192.168.0.1**. There is no separate PLC for the burner sequence — the LOGO! runs the start sequence, the analog monitoring and the safety/trip layer, and drives the panel indication via its own backlight and message display.

**Source programs** (held offline, unprotected, openable in LOGO!Soft Comfort):

| File | Role |
|---|---|
| \`BOILER SEQ AND ANALOG SENSORS.lsc\` | **Primary / deployed program** — full sequence + sensors + alarms |
| \`boiler sequence control 3.lsc\` | Earlier, simpler start-sequence revision |
| \`BOILER SAFETY.lsc\` | Trip / safety interlock layer |

If online access to the physical module is ever lost again, the program above is the master copy — it can be re-downloaded to the unit or to a replacement LOGO! 8.

## 2. I/O schedule

### Digital inputs

| Signal | Description | Terminal |
|---|---|---|
| START | Operator start / auto-start request | I_ _(confirm)_ |
| STOP SWITCH | Normal stop | I_ _(confirm)_ |
| EMERGENCY STOP | Hardwired E-stop into the logic | I_ _(confirm)_ |
| LOW WATER LEVEL SWITCH | Low-water cut-off / level probe | I_ _(confirm)_ |

### Analog inputs (sensors)

| Signal | Type / scaling | Terminal |
|---|---|---|
| STEAM PRESSURE | 4–20 mA pressure transmitter | AI1 (live ≈ 660–683 raw in the data log) |
| TEMPERATURE | Pt100, scaled to °C via an Amplifier block | AI_ _(confirm)_ |
| WATER L/HR | Water flow rate | AI_ _(confirm)_ |

### Digital outputs (actuators & indication)

| Signal | Description | Terminal |
|---|---|---|
| BLOWER DRIVE ENABLE | Combustion-air / purge fan enable | Q_ _(confirm)_ |
| IGNITOR | Ignition transformer / spark | Q_ _(confirm)_ |
| FUEL VALVE | Main fuel/gas valve (program block "B012 fuel") | Q_ _(confirm)_ |
| BOILER 1 ON | Boiler-running indication | Q_ _(confirm)_ |
| DUMP VALVE 1 | Pressure/safety dump | Q_ _(confirm)_ |
| DUMP VALVE 2 | Pressure/safety dump | Q_ _(confirm)_ |
| EMERGENCY DUMP VALVE | Emergency blow-down | Q_ _(confirm)_ |
| LOW-WATER PILOT LIGHT | "low water fault (pilot light)" | Q_ _(confirm)_ |

## 3. Sequence of operations

1. **Permissive check.** On START / AUTO START the controller confirms the run permissives: STOP and EMERGENCY STOP not active, and LOW WATER LEVEL healthy. If any permissive fails the sequence does not advance and the relevant alarm is raised.
2. **Purge.** BLOWER DRIVE ENABLE energises and the combustion-air fan runs for a timed pre-purge before any ignition is permitted.
3. **Ignition.** After the purge timer, IGNITOR energises; once the ignition delay elapses the FUEL VALVE opens and the burner lights.
4. **Run / modulation.** With the burner established, BOILER 1 ON is indicated. The controller monitors STEAM PRESSURE, TEMPERATURE (°C) and WATER L/HR against their working bands and holds the boiler in its normal run state.
5. **Normal stop.** On STOP, the fuel valve closes and the boiler returns to standby (post-purge as configured).

## 4. Safety / trip layer

A latching trip relay (an RS / latching-relay block, non-retentive — "Rem = off") locks the boiler out on any of the following and **stays tripped until reset**:

- **Low water** — LOW WATER LEVEL SWITCH → fuel cut, LOW WATER WARNING ALARM + low-water pilot light.
- **Over temperature** — TEMPERATURE above limit → "OVER TEMPERATURE !!!" and trip.
- **Over pressure** — STEAM PRESSURE above limit → DUMP VALVE(s) open.
- **Emergency stop** — EMERGENCY STOP → fuel cut + EMERGENCY DUMP VALVE.

## 5. Operator indication

The LOGO! drives a three-state backlight / message scheme on the panel display:

| State | Backlight | Meaning |
|---|---|---|
| Normal | White | Running / healthy |
| Warning | Amber | "ALARM / AMBER LIGHT" — attention, e.g. approaching a limit |
| Trip | Red | "ALARM / RED LIGHT" — boiler locked out |

Message texts present in the program: \`OVER TEMPERATURE !!!\`, \`LOW WATER WARNING ALARM\`, \`low water fault ( pilot light )\`, \`ALERTS\`.

## 6. Timer presets found in the program

These presets are read from the timer blocks in \`BOILER SEQ AND ANALOG SENSORS.lsc\`. The mapping of each preset to a specific step (purge vs. ignition vs. lockout) must be confirmed in LOGO!Soft Comfort. A \`+\` denotes a retentive timer.

\`00:11s\`, \`01:00s\`, \`02:00s\`, \`04:00s+\`, \`09:00s+\`, \`10:00s+\`, \`15:00s+\`, \`01:00m+\`, \`10:00m+\`, \`05:00h+\`

## 7. To be confirmed in LOGO!Soft Comfort (safety-critical)

Open \`BOILER SEQ AND ANALOG SENSORS.lsc\` and read off, then fill in above:

- The exact **analog trip setpoints** — over-pressure, over-temperature, low-water and flow thresholds (analog-trigger On/Off values).
- The **Amplifier gain/offset** scaling the Pt100 to °C and the 4–20 mA pressure span.
- The precise **terminal mapping** (which physical I/Q/AI each signal above uses).
- Which timer preset drives which sequence step.

_Reconstructed from the controller program. Treat as a working reference, not a stamped engineering document, until verified._
`;
