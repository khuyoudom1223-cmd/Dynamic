require("dotenv").config();
const { sequelize } = require("../src/models");

async function runMigrations() {
  try {
    console.log("Connecting to the database...");
    await sequelize.authenticate();
    console.log("Connection has been established successfully.");

    console.log("Running migrations...");
    // Sync all models (create tables if they don't exist)
    await sequelize.sync({ alter: true });
    console.log("Database synchronized successfully!");
  } catch (error) {
    console.error("Unable to connect to the database or run migrations:", error);
  } finally {
    await sequelize.close();
    process.exit();
  }
}

runMigrations();
