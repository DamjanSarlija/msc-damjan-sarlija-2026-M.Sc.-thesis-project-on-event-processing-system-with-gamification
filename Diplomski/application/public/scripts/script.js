const socket = io();

let stariPodaciUcitani = false;
let buffer = [];
let prikazaniIdevi = new Set();

function prikaziGamifikaciju(item) {
    const gamification_div = document.getElementById(`gamification_session_${item.device_id}`);
    gamification_div.innerHTML = `<p>exercise_id: ${item.exercise_id}</p><p>attempt: ${item.attempt}</p><p>phase: ${item.phase}</p><p>target_level: ${item.target_level}</p><p>reference_value: ${item.reference_value}</p><p>classification: ${item.classification}</p><p>success: ${item.success}</p><p>total_attempts: ${item.total_attempts}</p><p>successful_attempts: ${item.successful_attempts}</p><p>score: ${item.score}</p><p>status: ${item.status}</p>`
}

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
        
        if (!baza) {
            const gamification_div = document.getElementById(`gamification_session_${item.device_id}`);
            gamification_div.innerHTML = `<p>exercise_id: ${item.exercise_id}</p><p>attempt: ${item.attempt}</p><p>phase: ${item.phase}</p><p>target_level: ${item.target_level}</p><p>reference_value: ${item.reference_value}</p><p>classification: ${item.classification}</p><p>success: ${item.success}</p><p>total_attempts: ${item.total_attempts}</p><p>successful_attempts: ${item.successful_attempts}</p><p>score: ${item.score}</p><p>status: ${item.status}</p>`
        }
            

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
    const container_gamification = document.getElementById("container_gamification")
    container.innerHTML = '';
    container_interrupt.innerHTML = "";
    container_gamification.innerHTML = "";

    if (devices.length === 0) {
        container.innerHTML = '<span class="no-data">Nema uređaja</span>';
        container_interrupt.innerHTML = '<span class="no-data">Nema uređaja</span>';
        container_gamification.innerHTML = '<span class="no-data">Nema uređaja</span>';
        return;
    }

    devices.forEach(id => {
        const btn = document.createElement('button');
        const btn_interrupt = document.createElement("button");
        const gamification_div = document.createElement("div");
        gamification_div.id = `gamification_session_${id}`
        btn.textContent = `Zatraži podatke od uređaja ${id}`;
        btn.onclick = () => requestDevice(id);
        btn_interrupt.textContent = `Prekini vezu uređaju ${id} na 10 do 30 sekundi`;
        btn_interrupt.onclick = () => interruptDevice(id)
        container.appendChild(btn);
        container_interrupt.appendChild(btn_interrupt);
        container_gamification.appendChild(gamification_div)
    });
});

socket.on("new-data", (item) => {
    prikaziGamifikaciju(item);
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
