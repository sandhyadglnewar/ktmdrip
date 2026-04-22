#!/usr/bin/env node

/**
 * Initialize local D1 database with schema and seed data
 * Uses Wrangler's local D1 binding
 */

import { spawn } from "child_process";
import { join } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

async function executeSQL(sqlFile) {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", [
      "wrangler",
      "d1",
      "execute",
      "ktmdrip-db",
      `--file=${sqlFile}`,
    ], {
      cwd: join(__dirname, ".."),
      stdio: "pipe",
    });

    let output = "";
    let error = "";

    child.stdout.on("data", (data) => {
      output += data.toString();
    });

    child.stderr.on("data", (data) => {
      error += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0 || error.includes("UNIQUE constraint failed")) {
        // Code 0 = success, or UNIQUE error = already seeded
        resolve(output);
      } else {
        reject(new Error(error || `Process exited with code ${code}`));
      }
    });
  });
}

async function init() {
  console.log("📦 Initializing local D1 database...\n");

  try {
    console.log("📝 Creating schema...");
    await executeSQL("db/schema.sql");
    console.log("✅ Schema created\n");

    console.log("🌱 Seeding products...");
    await executeSQL("db/seed.sql");
    console.log("✅ Database seeded\n");

    console.log("✨ Local D1 database ready for development!\n");
  } catch (error) {
    // D1 operations might fail in some environments, but app still works in demo mode
    console.log("⚠️  Database initialization had issues (app will run in demo mode)");
    console.log(`Error: ${error.message}\n`);
  }
}

init();
