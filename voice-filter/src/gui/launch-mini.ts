import open from "open";
import { startGuiServer } from "./server.js";

const MINI_URL = "http://localhost:47823/mini";

async function launchMini(): Promise<void> {
  await startGuiServer(false);

  await open(MINI_URL, {
    app: {
      name: "chrome",
      arguments: [`--app=${MINI_URL}`, "--window-size=280,395", "--window-position=100,100"],
    },
  });
}

launchMini().catch(console.error);
