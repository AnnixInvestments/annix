import open from "open";
import { startGuiServer } from "./server.js";

const BASE_URL = "http://localhost:47823";

async function launchMini(): Promise<void> {
  await startGuiServer(false);

  await open(BASE_URL, {
    app: {
      name: "chrome",
      arguments: [`--app=${BASE_URL}`, "--window-size=420,600", "--window-position=100,100"],
    },
  });
}

launchMini().catch(console.error);
