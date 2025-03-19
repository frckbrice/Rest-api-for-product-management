import { Sequelize } from "sequelize";
import { Umzug, SequelizeStorage } from "umzug";

// Initialize your Sequelize instance
// const sequelize = new Sequelize({
//   username: process.env.PROD_DB_USERNAME as string,
//   password: process.env.PROD_DB_PASSWORD as string,
//   database: process.env.PROD_DB_NAME as string,
//   host: process.env.PROD_DB_HOSTNAME as string,
//   port: parseInt(process.env.PROD_DB_PORT as string, 10),
//   dialect: "postgres",
// });

// Configure Umzug for migrations
const runMigrations = async (sequelize: Sequelize, force: boolean): Promise<void> => {
  const umzug = new Umzug({
    migrations: {
      glob: "migrations/*.js", // Path to migrations
    },
    context: { queryInterface: sequelize.getQueryInterface(), Sequelize },
    storage: new SequelizeStorage({ sequelize }),
    logger: console,
  });

  try {
    console.log("Database start connecting .");
    await sequelize.authenticate();
    console.log("Database connected successfully.");
    console.log("Running migrations...");
    await umzug.up(); // Runs all pending migrations
    console.log("All migrations have been executed successfully.");
  } catch (error) {
    console.error("Error running migrations:", error);
    process.exit(1); // Exit the process if migrations fail
  } finally {
    await sequelize.close(); // Close connection after migrations
  }
};

export default runMigrations;
