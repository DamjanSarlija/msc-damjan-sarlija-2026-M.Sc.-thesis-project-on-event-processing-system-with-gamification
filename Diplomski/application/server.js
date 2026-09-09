const express = require("express");
const session = require("express-session")
//const ir = require("./routes/index.routes");
//const dr = require("./routes/datatable.routes");
//const ar = require("./routes/api.routes");
const path = require("path")
const { Server } = require("socket.io");
const http = require("http")
const app = express();
const devices = new Map();
const deviceDataStore = [];
const receiveRoute = require('./routes/receive_data')(deviceDataStore);
app.use('/api/data', receiveRoute);
//const { auth } = require("express-openid-connect");
const { connect, StringCodec } = require("nats");
const sc = StringCodec();
let nc;

async function startNATS() {
    nc = await connect({ servers: "nats://localhost:4222" });
    console.log("Connected to NATS");

    
    const dataSub = nc.subscribe("devices.data.>");
    (async () => {
        for await (const msg of dataSub) {
            const data = JSON.parse(sc.decode(msg.data));
            deviceDataStore.push({ ...data, vrijeme: new Date() });
            io.emit("new-data", data);
        }
    })();

    
    const cmdSub = nc.subscribe("devices.commands.>");
    (async () => {
        for await (const msg of cmdSub) {
            const { deviceId } = JSON.parse(sc.decode(msg.data));
            io.to(deviceId).emit("send-data-now");
        }
    })();
}




const port = 3000;



/* const authConfig = {
    authRequired: false,
    auth0Logout: true,
    secret: "anything",
    baseURL: "http://localhost:3000",
    clientID: "Jx7y3oPNmCMRgdvONJj9BEG8BIJzni6h",
    issuerBaseURL: "https://dev-58jxy06foitq3exp.us.auth0.com",
}; */

//app.use(auth(authConfig));
app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: true }));
app.use(express.json())

const server = http.createServer(app);
const io = new Server(server);

io.on("connection", (socket) => {
    console.log("connected:", socket.id);

    // register device
    socket.on("register", (deviceId) => {
        socket.deviceId = String(deviceId);
        socket.join(socket.deviceId);
        devices.set(socket.deviceId, socket.id);
        io.emit("devices-update", Array.from(devices.keys()));
        console.log("Device joined room:", socket.deviceId);
    });


    socket.on("device-data", (data) => {
        nc.publish(`devices.data.${data.id}`, sc.encode(JSON.stringify(data)));
    });

    socket.on("request-data", (deviceId) => {
        nc.publish(`devices.commands.${deviceId}`, sc.encode(JSON.stringify({ deviceId })));
    });

    socket.on("disconnect", () => {
        if (socket.deviceId) {
            devices.delete(socket.deviceId);
            io.emit("devices-update", Array.from(devices.keys()));
        }
    });
});


// Import route
//const receiveRoute = require('./routes/receive_data');

// Use route
app.use('/api/data', receiveRoute);

app.use(express.static(path.join(__dirname, "public")));
app.set('views', path.join(__dirname, 'views'));





app.use(
    session({
        secret: "anything",
        resave: false,
        saveUninitialized: true,
    })
);

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Doslo je do greske');
});

//app.use("/", ir);
//app.use("/datatable", dr)
//app.use("/api", ar)


app.use((req, res, next) => {
    res.status(404).json({
        status: "Not Found",
        message: "Traženi endpoint ne postoji ili se koristi neispravna HTTP metoda"
    });
  });

startNATS().then(() => {
    server.listen(3000, () => console.log("Server running on port 3000"));
}).catch(err => {
    console.error("Failed to connect to NATS:", err);
    process.exit(1);
});