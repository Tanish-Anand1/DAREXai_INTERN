import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url().or(z.string().startsWith("postgresql://")),
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(16),
  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
  APP_ORIGIN: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(16),
  GEMINI_API_KEY: z.string().optional().default(""),
  USE_SANDBOX: z.string().optional().default("true"),
  META_APP_SECRET: z.string().optional().default(""),
  META_VERIFY_TOKEN: z.string().optional().default(""),
  META_ACCESS_TOKEN: z.string().optional().default(""),
  META_PHONE_NUMBER_ID: z.string().optional().default(""),
  WHATSAPP_SANDBOX_URL: z.string().url().optional().default("http://localhost:3000/api/mock/whatsapp"),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/darexai",
  NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "http://localhost:3000",
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? "dev-nextauth-secret-change-me",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? "",
  APP_ORIGIN: process.env.APP_ORIGIN ?? "http://localhost:3000",
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-change-me",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? "",
  USE_SANDBOX: process.env.USE_SANDBOX ?? "true",
  META_APP_SECRET: process.env.META_APP_SECRET ?? "",
  META_VERIFY_TOKEN: process.env.META_VERIFY_TOKEN ?? "",
  META_ACCESS_TOKEN: process.env.META_ACCESS_TOKEN ?? "",
  META_PHONE_NUMBER_ID: process.env.META_PHONE_NUMBER_ID ?? "",
  WHATSAPP_SANDBOX_URL: process.env.WHATSAPP_SANDBOX_URL ?? "http://localhost:3000/api/mock/whatsapp",
});
