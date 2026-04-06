import { createClient } from "@clickhouse/client";

const clickHouseClient = createClient({
  url: "https://clickhouse-2-staging.penpencil.co:443",
  username: "learn2earn",
  password: "learn2earn@stage123",
  database: "learn_2_earn",
});

export default clickHouseClient;
