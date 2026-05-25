const http = require("http");
const { Server } = require("socket.io");
const { connect, StringCodec } = require("nats");

const sc = StringCodec();
const devices = new Map();

const server = http.createServer();
const io = new Server(server, {
    cors: { origin: "http://localhost:3000" }
});

async function start() {
    const nc = await connect({ servers: "nats://localhost:4222" });
    console.log("Device Gateway connected to NATS");

    const cmdSub = nc.subscribe("devices.commands.>");
    (async () => {
        for await (const msg of cmdSub) {
            const { deviceId } = JSON.parse(sc.decode(msg.data));
            console.log("Forwarding command to device:", deviceId);
            io.to(deviceId).emit("send-data-now");
        }
    })();

    const listSub = nc.subscribe("devices.list");
    (async () => {
        for await (const msg of listSub) {
            msg.respond(sc.encode(JSON.stringify({
                devices: Array.from(devices.keys())
            })));
        }
    })();

    io.on("connection", (socket) => {
        console.log("Device connected:", socket.id);

        socket.on("register", (deviceId) => {
            socket.deviceId = String(deviceId);
            socket.join(socket.deviceId);
            devices.set(socket.deviceId, socket.id);
            console.log("Device registered:", socket.deviceId);

            nc.publish("devices.status", sc.encode(JSON.stringify({
                event: "connected",
                devices: Array.from(devices.keys())
            })));
        });

        socket.on("device-data", (data) => {
            console.log("Received data from device:", data);
            nc.publish(`devices.data.${data.id}`, sc.encode(JSON.stringify(data)));
        });

        socket.on("disconnect", () => {
            if (socket.deviceId) {
                devices.delete(socket.deviceId);
                console.log("Device disconnected:", socket.deviceId);

                nc.publish("devices.status", sc.encode(JSON.stringify({
                    event: "disconnected",
                    devices: Array.from(devices.keys())
                })));
            }
        });
    });

    server.listen(3001, () => {
        console.log("Device Gateway running on port 3001");
    });
}

start().catch(err => {
    console.error("Device Gateway failed to start:", err);
    process.exit(1);
});