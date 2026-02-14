import { type AudioDevice, listInputDevices, listOutputDevices } from "../audio/capture.js";
import { findVBCableDevice } from "../audio/output.js";

export function devicesCommand(): void {
  console.log("\n=== Audio Devices ===\n");

  const inputDevices = listInputDevices();
  const outputDevices = listOutputDevices();
  const vbCableId = findVBCableDevice();

  console.log("INPUT DEVICES (Microphones):");
  console.log("----------------------------");
  if (inputDevices.length === 0) {
    console.log("  No input devices found");
  } else {
    inputDevices.forEach((device: AudioDevice) => {
      const defaultMarker = device.id === 0 ? " [DEFAULT]" : "";
      console.log(`  [${device.id}] ${device.name}${defaultMarker}`);
      console.log(
        `      Channels: ${device.maxInputChannels}, Sample Rate: ${device.defaultSampleRate}Hz`,
      );
      console.log(`      Host API: ${device.hostAPIName}`);
    });
  }

  console.log("\nOUTPUT DEVICES (Speakers/Virtual):");
  console.log("-----------------------------------");
  if (outputDevices.length === 0) {
    console.log("  No output devices found");
  } else {
    outputDevices.forEach((device: AudioDevice) => {
      const vbMarker = device.id === vbCableId ? " [VB-CABLE]" : "";
      const defaultMarker = device.id === 0 ? " [DEFAULT]" : "";
      console.log(`  [${device.id}] ${device.name}${vbMarker}${defaultMarker}`);
      console.log(
        `      Channels: ${device.maxOutputChannels}, Sample Rate: ${device.defaultSampleRate}Hz`,
      );
      console.log(`      Host API: ${device.hostAPIName}`);
    });
  }

  console.log("\n=== VB-Cable Status ===\n");
  if (vbCableId !== null) {
    const vbDevice = outputDevices.find((d) => d.id === vbCableId);
    console.log(`VB-Cable detected: [${vbCableId}] ${vbDevice?.name}`);
    console.log("\nTo use VB-Cable as your virtual microphone:");
    console.log("  1. Run: voice-filter start");
    console.log(
      "  2. In your app (Discord, Teams, etc.), select 'CABLE Output' as your microphone",
    );
  } else {
    console.log("VB-Cable not detected!");
    console.log("\nTo install VB-Cable:");
    console.log("  1. Download from: https://vb-audio.com/Cable/");
    console.log("  2. Run the installer as Administrator");
    console.log("  3. Restart this command to verify installation");
  }

  console.log("");
}
