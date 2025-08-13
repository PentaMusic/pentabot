import "dotenv/config";
import express from "express";
import cors from "cors";

async function evalAndCaptureOutput(code) {
  const oldLog = console.log;
  const oldError = console.error;

  const output = [];
  let errorOutput = [];

  console.log = (...args) => output.push(args.join(" "));
  console.error = (...args) => errorOutput.push(args.join(" "));

  try {
    await eval(code);
  } catch (error) {
    errorOutput.push(error.message);
  }

  console.log = oldLog;
  console.error = oldError;

  return { stdout: output.join("\n"), stderr: errorOutput.join("\n") };
}

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors({ origin: "*" }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    service: "executor",
    timestamp: new Date().toISOString(),
    port: port
  });
});

app.post("/", async (req, res) => {
  const { code } = req.body;
  console.log("Executing code:", code);
  
  try {
    const result = await evalAndCaptureOutput(code);
    console.log("Execution result:", result);
    res.json(result);
  } catch (error) {
    console.error("Execution error:", error);
    res.status(500).json({ 
      error: error.message,
      stdout: "",
      stderr: error.message
    });
  }
});

// Export the app for Genezio
export default app;

// Only start server if not in Genezio environment
if (!process.env.GENEZIO_TOKEN) {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}
