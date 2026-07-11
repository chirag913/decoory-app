import "dotenv/config";
import app from "./app.js";
import { startScheduler } from "./services/scheduler.js";

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Decoory server listening on http://localhost:${PORT}`);
  startScheduler();
});
