import net from "node:net";

const [portArg, hostArg = "127.0.0.1", timeoutArg = "60000"] = process.argv.slice(2);
const port = Number(portArg);
const host = hostArg;
const timeoutMs = Number(timeoutArg);

if (!Number.isInteger(port)) {
  console.error("wait-for-port: port must be an integer");
  process.exit(1);
}

const deadline = Date.now() + timeoutMs;

function tryConnect() {
  const socket = net.createConnection({ port, host });

  socket.on("connect", () => {
    socket.end();
    process.exit(0);
  });

  socket.on("error", () => {
    socket.destroy();
    if (Date.now() >= deadline) {
      console.error(`wait-for-port: timed out waiting for ${host}:${port}`);
      process.exit(1);
    }
    setTimeout(tryConnect, 1000);
  });
}

tryConnect();
