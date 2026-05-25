const express = require("express");
const { connect, StringCodec } = require("nats");

const sc = StringCodec();
const deviceDataStore = [];

const app = express();

app.get("/api/data", (req, res) => {
    res.json(deviceDataStore);
});

async function start() {
    const nc = await connect({ servers: "nats://localhost:4222" });
    console.log("Data Processor connected to NATS");

    const dataSub = nc.subscribe("devices.data.>");
    (async () => {
        for await (const msg of dataSub) {
            const data = JSON.parse(sc.decode(msg.data));
            console.log("Storing data:", data);
            deviceDataStore.push({ ...data, vrijeme: new Date() });
        }
    })();

    app.listen(3002, () => {
        console.log("Data Processor running on port 3002");
    });
}

start().catch(err => {
    console.error("Data Processor failed to start:", err);
    process.exit(1);
});