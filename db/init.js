#!/usr/bin/env node

/**
 * Initialize local D1 database with schema and seed data
 * Run: node db/init.js
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import Database from "better-sqlite3";

const dbDir = join(process.cwd(), ".wrangler", "state", "v3");
const dbPath = join(dbDir, "d1", "database.sqlite");

// Ensure directories exist
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}
if (!existsSync(join(dbDir, "d1"))) {
  mkdirSync(join(dbDir, "d1"), { recursive: true });
}

console.log("📦 Initializing local D1 database...");

try {
  // Open or create database
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  // Read schema
  const schema = readFileSync(join(process.cwd(), "db", "schema.sql"), "utf-8");
  
  // Execute schema
  db.exec(schema);
  console.log("✅ Database schema created");

  // Read and execute seed
  const seed = readFileSync(join(process.cwd(), "db", "seed.sql"), "utf-8");
  db.exec(seed);
  console.log("✅ Database seeded with products");

  // Verify
  const productCount = db.prepare("SELECT COUNT(*) as count FROM products").get();
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get();
  
  console.log(`\n📊 Database Status:`);
  console.log(`   Products: ${productCount.count}`);
  console.log(`   Users: ${userCount.count}`);
  console.log(`\n✨ Ready for local development!`);

  db.close();
} catch (error) {
  console.error("❌ Error initializing database:", error.message);
  process.exit(1);
}
