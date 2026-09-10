const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const { connect, StringCodec } = require("nats");
const pg = require("pg");
const de = require("dotenv");
de.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});


const sc = StringCodec();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.get("/podaci", async (req, res) => {
    const result = await pool.query("SELECT * FROM podaci ORDER BY generated_at");
    console.log((await result).rowCount);
    res.json(result.rows);
})

app.delete("/podaci", async (req,res) => {
    const result = await pool.query("DELETE FROM podaci");
    res.json({success: true});
})

app.use((req, res) => {
    res.status(404).json({ status: "Not Found", message: "Endpoint ne postoji" });
});

async function handlerPodataka(dataSub, io) {
    for await (const poruka of dataSub) {
        const podaci = JSON.parse(sc.decode(poruka.data));
        console.log("Saljem podatke na frontend: ", podaci);
        io.emit("new-data", podaci);
    }
}

async function handlerStatusa(statusSub, io) {
    for await (const poruka of statusSub) {
        const { uredaji } = JSON.parse(sc.decode(poruka.data));
        console.log("Azuriranje uredaja: ", uredaji);
        io.emit("devices-update", uredaji);
    }
}

async function handlerPodatakaIzBaze(databaseSub, io) {
    for await (const poruka of databaseSub) {
        const podaci = JSON.parse(sc.decode(poruka.data));
        console.log("Saljem podatke iz baze na frontend: ", podaci);
        io.emit("database_data", podaci);
    }
}

async function start() {
    const nc = await connect({ servers: "nats://localhost:4222" });
    console.log("Frontend Gateway spojen na NATS");

    const dataSub = nc.subscribe("devices.data.>");
    handlerPodataka(dataSub, io);

    const statusSub = nc.subscribe("devices.status");
    handlerStatusa(statusSub, io);

    const databaseSub = nc.subscribe("database.data");
    handlerPodatakaIzBaze(databaseSub, io);

    io.on("connection", async (socket) => {
        console.log("Frontend povezan:", socket.id);

        try {
            const reply = await nc.request(
                "devices.list",
                sc.encode(""),
                { timeout: 1000 }
            );
            const { uredaji } = JSON.parse(sc.decode(reply.data));
            socket.emit("devices-update", uredaji);
        } catch (err) {
            console.log("Nemoguce dohvatiti listu uredaja:", err.message);
        }

        socket.on("request-data", (deviceId) => {
            console.log("Frontend trazi podatke od uredaja:", deviceId);
            nc.publish(
                `devices.commands.${deviceId}`,
                sc.encode(JSON.stringify({ deviceId }))
            );
        });

        socket.on("interrupt_device", (deviceId) => {
            console.log("Frontend trazi prekid veze uredaja:", deviceId);
            nc.publish(
                `devices.interruptions.${deviceId}`,
                sc.encode(JSON.stringify({ deviceId }))
            );
        })

        socket.on("disconnect", () => {
            console.log("Frontend odspojen:", socket.id);
        });
    });

    server.listen(3000, () => {
        console.log("Frontend Gateway pokrenut na portu 3000");
    });
}

start()