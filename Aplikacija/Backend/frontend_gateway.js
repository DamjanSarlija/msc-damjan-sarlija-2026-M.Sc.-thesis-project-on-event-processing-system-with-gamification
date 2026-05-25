const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const { connect, StringCodec } = require("nats");

const sc = StringCodec();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use((req, res) => {
    res.status(404).json({ status: "Not Found", message: "Endpoint ne postoji" });
});

async function start() {
    const nc = await connect({ servers: "nats://localhost:4222" });
    console.log("Frontend Gateway connected to NATS");

    
    const dataSub = nc.subscribe("devices.data.>");
    (async () => {
        for await (const msg of dataSub) {
            const data = JSON.parse(sc.decode(msg.data));
            console.log("Pushing data to frontend:", data);
            io.emit("new-data", data);
        }
    })();

    
    const statusSub = nc.subscribe("devices.status");
    (async () => {
        for await (const msg of statusSub) {
            const { devices } = JSON.parse(sc.decode(msg.data));
            console.log("Devices update:", devices);
            io.emit("devices-update", devices);
        }
    })();

    io.on("connection", async (socket) => {
        console.log("Browser connected:", socket.id);

        
        try {
            const reply = await nc.request(
                "devices.list",
                sc.encode(""),
                { timeout: 1000 }
            );
            const { devices } = JSON.parse(sc.decode(reply.data));
            socket.emit("devices-update", devices);
        } catch (err) {
            console.log("Could not fetch device list:", err.message);
        }

        socket.on("request-data", (deviceId) => {
            console.log("Browser requested data from device:", deviceId);
            nc.publish(
                `devices.commands.${deviceId}`,
                sc.encode(JSON.stringify({ deviceId }))
            );
        });

        socket.on("disconnect", () => {
            console.log("Browser disconnected:", socket.id);
        });
    });

    server.listen(3000, () => {
        console.log("Frontend Gateway running on port 3000");
    });
}

start().catch(err => {
    console.error("Frontend Gateway failed to start:", err);
    process.exit(1);
});