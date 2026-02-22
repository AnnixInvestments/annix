import open from "open";
import { startGuiServer } from "./server.js";

const FRONTEND_URL = "http://localhost:3000/voice-filter";

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
