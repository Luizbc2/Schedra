// Load before application modules so integration tests never use the developer database.
if (process.env.TEST_DATABASE_URL) {
  const url = new URL(process.env.TEST_DATABASE_URL);
  if (!url.pathname.toLowerCase().includes("test")) throw new Error("Integration database name must contain 'test'.");
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.AUTH_SEED_ENABLED = "false";
}
