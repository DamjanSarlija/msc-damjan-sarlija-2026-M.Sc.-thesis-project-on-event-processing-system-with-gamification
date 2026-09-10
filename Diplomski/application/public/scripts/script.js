const socket = io();

let stariPodaciUcitani = false;
let buffer = [];
let prikazaniIdevi = new Set();

function prikaziPodatak(item, baza = false) {
    if (prikazaniIdevi.has(item.event_id)) {
        return;
    } else {
        prikazaniIdevi.add(item.event_id);
        const list = document.getElementById('data-list');
        const placeholder = list.querySelector('.no-data');
        if (placeholder) placeholder.remove();

        const li = document.createElement('li');
        li.dataset.event_id = item.event_id;
        if (baza) {
            li.textContent = `✅ Uređaj ${item.device_id}: ${item.value} — ${new Date(item.generated_at).toLocaleTimeString()}`;
        } else {
            li.textContent = `⌛ Uređaj ${item.device_id}: ${item.value} — ${new Date(item.generated_at).toLocaleTimeString()}`;            
        }

        list.prepend(li);
    }
} 

function requestDevice(id) {
    socket.emit("request-data", String(id));
}

function interruptDevice(id) {
    socket.emit("interrupt_device", String(id));
}

socket.on("devices-update", (devices) => {
    const container = document.getElementById('device-buttons');
    const container_interrupt = document.getElementById("device_interrupt")
    container.innerHTML = '';
    container_interrupt.innerHTML = ""

    if (devices.length === 0) {
        container.innerHTML = '<span class="no-data">Nema uređaja</span>';
        container_interrupt.innerHTML = '<span class="no-data">Nema uređaja</span>';
        return;
    }

    devices.forEach(id => {
        const btn = document.createElement('button');
        const btn_interrupt = document.createElement("button");
        btn.textContent = `Zatraži podatke od uređaja ${id}`;
        btn.onclick = () => requestDevice(id);
        btn_interrupt.textContent = `Prekini vezu uređaju ${id} na 10 do 30 sekundi`;
        btn_interrupt.onclick = () => interruptDevice(id)
        container.appendChild(btn);
        container_interrupt.appendChild(btn_interrupt);
    });
});

socket.on("new-data", (item) => {
    if (stariPodaciUcitani) {
        prikaziPodatak(item, false);
    } else {
        buffer.push(item);
    }

});

socket.on("database_data", (item) => {
    const li = document.querySelector(`[data-event_id="${item.event_id}"]`);
    if (li) {
        li.textContent = li.textContent.replace("⌛", "✅");
    } else {
        prikaziPodatak(item, true);
    }
})


async function fetchData() {
    try {
        //const res = await fetch('http://localhost:3002/api/data');
        const res = await fetch('http://localhost:3000/podaci');
        const data = await res.json();
        if (data.length === 0) return;

        const list = document.getElementById('data-list');
        list.innerHTML = '';

        data.slice().forEach(item => {
            /*
            const li = document.createElement('li');
            const time = new Date(item.vrijeme).toLocaleTimeString();
            li.textContent = `Uređaj ${item.uredjaj_id}: ${item.podatak} — ${time}`;
            list.appendChild(li); */
            prikaziPodatak(item, true);
        });
        stariPodaciUcitani = true;
    } catch (err) {
        console.error("Could not load historical data:", err);
    }
}

async function loadBufferedData() {
    for (const item of buffer) {
        prikaziPodatak(item, false);
    }
}

async function inicijalizacija() {
    await fetchData();
    if (buffer.length > 0) {
        await loadBufferedData();
        buffer = [];
    }
}

async function obrisiSvePodatke() {
    await fetch("http://localhost:3000/podaci", { method: "DELETE"});
    document.getElementById("data-list").innerHTML = "";
    prikazaniIdevi.clear();
}

inicijalizacija();
