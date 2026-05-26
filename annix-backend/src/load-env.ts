import { config as dotenvConfig } from "dotenv";

// Load .env first so STORAGE_TYPE / AWS_* are available when modules construct.
dotenvConfig({ override: true });
