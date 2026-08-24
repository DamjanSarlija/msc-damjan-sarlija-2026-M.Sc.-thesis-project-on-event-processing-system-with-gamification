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

        const res = await pool.query("INSERT INTO podaci (podatak_id, uredjaj_id, podatak, vrijeme) VALUES ($1, $2, $3, $4) RETURNING *", [podaci.podatak_id, String(podaci.uredjaj_id), podaci.podatak, podaci.vrijeme]);
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