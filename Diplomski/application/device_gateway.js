const http = require("http");
const { Server } = require("socket.io");
const { connect, StringCodec } = require("nats");

const sc = StringCodec();
const uredaji = new Map();

const server = http.createServer();
const io = new Server(server, {
    cors: { origin: "http://localhost:3000" }
});

async function handlerKomandi(cmdSub, io) {
    for await (const poruka of cmdSub) {
        const { deviceId } = JSON.parse(sc.decode(poruka.data));
        console.log("Saljem naredbu uredaju ", deviceId);
        io.to(deviceId).emit("data_request");
    }
}

async function handlerPrekida(interruptionSub, io) {
    for await (const poruka of interruptionSub) {
        const { deviceId } = JSON.parse(sc.decode(poruka.data));
        console.log("Saljem prekid uredaju ", deviceId);
        io.to(deviceId).emit("interruption");
    }
}

async function handlerListeUredaja(listSub, io) {
    for await (const poruka of listSub) {
        poruka.respond(sc.encode(JSON.stringify({uredaji: Array.from(uredaji.keys())})));
    }
}

async function start() {
    const nc = await connect({ servers: "nats://localhost:4222" });
    console.log("Device Gateway spojen na NATS");

    const cmdSub = nc.subscribe("devices.commands.>");

    handlerKomandi(cmdSub, io);

    const interruptionSub = nc.subscribe("devices.interruptions.>");

    handlerPrekida(interruptionSub, io);


    const listSub = nc.subscribe("devices.list");

    handlerListeUredaja(listSub, io);

    
    io.on("connection", (socket) => {
        console.log("Uredaj spojen:", socket.id);

        socket.on("register", (device_id) => {
            socket.device_id = String(device_id);
            socket.join(socket.device_id);
            uredaji.set(socket.device_id, socket.id);
            console.log("Uredaj registriran", socket.device_id);

            nc.publish("devices.status", sc.encode(JSON.stringify({
                event: "connected",
                uredaji: Array.from(uredaji.keys())
            })));
        });

        socket.on("device_data", (data) => {
            console.log("Podaci primljeni s uredaja", data);
            nc.publish(`devices.data.${data.device_id}`, sc.encode(JSON.stringify(data)));
        });

        socket.on("disconnect", () => {
            if (socket.device_id) {
                uredaji.delete(socket.device_id);
                console.log("Uredaj odspojen", socket.device_id);

                nc.publish("devices.status", sc.encode(JSON.stringify({
                    event: "disconnected",
                    uredaji: Array.from(uredaji.keys())
                })));
            }
        });
    });
    

    server.listen(3001, () => {
        console.log("Device Gateway pokrenut na portu 3001");
    });
}

start();