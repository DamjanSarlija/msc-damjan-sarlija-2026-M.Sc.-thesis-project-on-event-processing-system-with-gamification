const de = require("dotenv");
de.config();

const pg = require("pg");

const express = require("express");
const { connect, StringCodec } = require("nats");

const sc = StringCodec();
const deviceDataStore = [];

const app = express();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

app.get("/api/data", async (req, res) => {

    const result = await pool.query("SELECT * FROM podaci ORDER BY vrijeme DESC");
    res.json(result.rows);
    //res.json(deviceDataStore);
});

async function handlerPodataka(dataSub, nc) {
    for await (const poruka of dataSub) {
        const podaci = JSON.parse(sc.decode(poruka.data));
        console.log("Pohranjujem podatke: ", podaci);

        const res = await pool.query("INSERT INTO podaci (event_id, device_id, event_type, profile, scenario, generated_at, value) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *", [podaci.event_id, String(podaci.device_id), podaci.event_type, podaci.profile, podaci.scenario, podaci.generated_at, podaci.value]);
        //deviceDataStore.push({ ...podaci, vrijeme: new Date() });
        const noviRedak = res.rows[0];
        nc.publish("database.data", sc.encode(JSON.stringify(noviRedak)));
        console.log("Šaljem pohranjene podatke", noviRedak);
        
    }
}

async function start() {
    const nc = await connect({ servers: "nats://localhost:4222" });
    console.log("Data Processor spojen na NATS");

    const dataSub = nc.subscribe("devices.data.>");
    handlerPodataka(dataSub, nc);

    app.listen(3002, () => {
        console.log("Data Processor pokrenut na portu 3002");
    });
} 

start()