import { createEnv } from "@t3-oss/env-core";
import dotenv from "dotenv";
import { ethers } from "ethers";
import { z } from "zod";

dotenv.config();

const DEFAULT_FASTIFY_PORT = 3006;
const DEFAULT_FASTIFY_ADDRESS = "127.0.0.1";

export const env = createEnv({
  clientPrefix: "",
  server: {
    NODE_ENV: z.enum(["prod", "test", "dev"]).default("dev"),
    SESSION_SECRET: z
      .string()
      .default("a secret with minimum length of 32 characters"),
    FASTIFY_PORT: z.coerce.number().default(DEFAULT_FASTIFY_PORT),
    FASTIFY_ADDRESS: z.string().default(DEFAULT_FASTIFY_ADDRESS),
    LOG_LEVEL: z.string().default("debug"),
    // DB_HOST: z.string().default("127.0.0.1"),
    // DB_PORT: z.coerce.number().default(5432),
    // DB_USER: z.string().default("eevy_admin"),
    // DB_PASSWORD: z.string().default("admin"),
    // DB_DATABASE: z.string().default("eevy"),
    INFURA_PROJECT_ID: z.string(),
    ATTESTER_SK: z.string(),
    CHAIN_ID: z.coerce.number().default(1337),
    SECRET_TTL: z.coerce.number().default(300 * 1000), // default to 5 minutes
    WALLET_ADDRESS_WHITELIST: z
      .string()
      .optional()
      .transform((val) => val?.split(",").map(ethers.getAddress)),
    SLN_ATTESTATION_API: z.string().default("http://127.0.0.1:3106"),
    COMMON_API: z.string().default("http://127.0.0.1:3005"),
    PROJECT_API_KEY: z.string(),
    REDBRICK_API: z.string().default("https://api-dev.redbrick.land"),
    LAUNCHPAD_BACKEND_URL: z.string().default("https://store-backend-stage.smartlayer.network"),
    JWT_SECRET: z.string().default("SuPeRpaSsW0rd"),
  },
  client: {},
  runtimeEnv: process.env,
});
