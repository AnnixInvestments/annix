import open from "open";
import { startGuiServer } from "./server.js";

const FRONTEND_URL =
  process.env.ANNIX_VOICE_FILTER_URL ?? "http://localhost:3000/annix-pulse/voice-filter";

async function launchMini(): Promise<void> {
  await startGuiServer();

  await open(FRONTEND_URL, {
    app: {
      name: "chrome",
      arguments: [`--app=${FRONTEND_URL}`, "--window-size=420,600", "--window-position=100,100"],
    },
  });
}

launchMini().catch(console.error);
