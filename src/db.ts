import postgres from "postgres";

const getDbClient = ({ applicationName = "r", maxPoolSize = 1 }) => {
  const sql = postgres({
    host: Bun.env.DB_HOST,
    port: Number(Bun.env.DB_PORT || 5432),
    username: Bun.env.DB_USERNAME,
    password: Bun.env.DB_PASSWORD,
    database: Bun.env.DB_DATABASE,
    max: Number(maxPoolSize || 1),
    onnotice: () => {},
    fetch_types: false,
    prepare: false,
    target_session_attrs: "primary",
    connection: {
      application_name: applicationName,
      statement_timeout: Number(Bun.env.DB_STATEMENT_TIMEOUT || 1000),
      lock_timeout: Number(Bun.env.DB_LOCK_TIMEOUT || 1000),
      idle_in_transaction_session_timeout: Number(
        Bun.env.DB_IDLE_IN_TRANSACTION_SESSION_TIMEOUT || 1000
      ),
    },
  });

  return sql;
};

export default getDbClient;
