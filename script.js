const processes = [];
let editingIndex = null;
const MAX_VALUE = 10000;

const form = document.getElementById("process-form");
const processIdInput = document.getElementById("process-id");
const arrivalInput = document.getElementById("arrival-time");
const burstInput = document.getElementById("burst-time");
const submitButton = document.getElementById("submit-process");
const cancelEditButton = document.getElementById("cancel-edit");
const processTable = document.getElementById("process-table");
const errorMessage = document.getElementById("error-message");
const resultsSection = document.getElementById("results");
const algorithmSelect = document.getElementById("algorithm");
const quantumContainer = document.getElementById("quantum-container");

const WORKLOADS = {
    A: [
        { id: "P1", arrival: 0, burst: 8 },
        { id: "P2", arrival: 1, burst: 4 },
        { id: "P3", arrival: 2, burst: 2 },
        { id: "P4", arrival: 4, burst: 1 }
    ],
    B: [
        { id: "P1", arrival: 2, burst: 3 },
        { id: "P2", arrival: 2, burst: 1 },
        { id: "P3", arrival: 8, burst: 2 },
        { id: "P4", arrival: 9, burst: 1 }
    ]
};

function showError(message) {
    errorMessage.textContent = message;
}

function resetResults() {
    resultsSection.hidden = true;
    document.getElementById("gantt-chart").replaceChildren();
    document.getElementById("results-table").replaceChildren();
    document.getElementById("averages").textContent = "";
    document.getElementById("verification").textContent = "";
}

function validateProcess(id, arrival, burst) {
    if (!id) throw new Error("Process ID cannot be empty.");
    if (processes.some((p, i) => i !== editingIndex && p.id === id)) {
        throw new Error("Process IDs must be unique.");
    }
    if (!Number.isInteger(arrival) || arrival < 0) {
        throw new Error("Arrival time must be a nonnegative integer.");
    }
    if (!Number.isInteger(burst) || burst <= 0) {
        throw new Error("CPU burst must be a positive integer.");
    }
    if (arrival > MAX_VALUE || burst > MAX_VALUE) {
        throw new Error(`Arrival time and CPU burst must not exceed ${MAX_VALUE}.`);
    }
}

function saveProcess(id, arrival, burst) {
    id = id.trim();
    validateProcess(id, arrival, burst);

    if (editingIndex === null) {
        processes.push({ id, arrival, burst });
    } else {
        processes[editingIndex] = { id, arrival, burst };
    }
    cancelEdit();
    renderProcessList();
    resetResults();
}

function startEdit(index) {
    const p = processes[index];
    editingIndex = index;
    processIdInput.value = p.id;
    arrivalInput.value = p.arrival;
    burstInput.value = p.burst;
    submitButton.textContent = "Update Process";
    cancelEditButton.hidden = false;
    showError("");
    processIdInput.focus();
}

function cancelEdit() {
    editingIndex = null;
    form.reset();
    submitButton.textContent = "Add Process";
    cancelEditButton.hidden = true;
}

function renderProcessList() {
    processTable.replaceChildren();

    processes.forEach((process, index) => {
        const row = document.createElement("tr");

        [process.id, process.arrival, process.burst].forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

        const actionCell = document.createElement("td");

        const editButton = document.createElement("button");
        editButton.textContent = "Edit";
        editButton.className = "secondary";
        editButton.type = "button";
        editButton.addEventListener("click", () => startEdit(index));

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Remove";
        deleteButton.className = "delete";
        deleteButton.type = "button";
        deleteButton.addEventListener("click", () => {
            processes.splice(index, 1);
            cancelEdit();
            renderProcessList();
            resetResults();
            showError("");
        });

        actionCell.append(editButton, deleteButton);
        row.appendChild(actionCell);
        processTable.appendChild(row);
    });
}

form.addEventListener("submit", event => {
    event.preventDefault();
    showError("");

    try {
        saveProcess(
            processIdInput.value,
            Number(arrivalInput.value),
            Number(burstInput.value)
        );
        processIdInput.focus();
    } catch (error) {
        showError(error.message);
    }
});

cancelEditButton.addEventListener("click", () => {
    cancelEdit();
    showError("");
});

document.getElementById("clear-all").addEventListener("click", () => {
    processes.length = 0;
    cancelEdit();
    renderProcessList();
    resetResults();
    showError("");
});

function loadWorkload(name) {
    processes.length = 0;
    WORKLOADS[name].forEach(p => processes.push({ ...p }));
    cancelEdit();
    renderProcessList();
    resetResults();
    showError("");
}

document.getElementById("load-example").addEventListener("click", () => loadWorkload("A"));
document.getElementById("load-example-b").addEventListener("click", () => loadWorkload("B"));

function renderResults(result) {
    const ganttChart = document.getElementById("gantt-chart");
    const resultsTable = document.getElementById("results-table");

    ganttChart.replaceChildren();
    resultsTable.replaceChildren();

    result.timeline.forEach(interval => {
        const item = document.createElement("div");
        item.className = "gantt-item";
        // Width grows with duration; each slice stays its own block (RR boundaries stay visible).
        item.style.flex = `${interval.end - interval.start} 0 65px`;

        const block = document.createElement("div");
        block.className = "gantt-process" + (interval.id === "IDLE" ? " idle" : "");
        block.textContent = interval.id;

        const label = document.createElement("div");
        label.className = "gantt-time";
        label.textContent = `${interval.start} – ${interval.end}`;

        item.append(block, label);
        ganttChart.appendChild(item);
    });

    result.metrics.forEach(p => {
        const row = document.createElement("tr");
        [
            p.id, p.arrival, p.burst, p.start, p.completion,
            p.turnaround, p.waiting, p.response
        ].forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });
        resultsTable.appendChild(row);
    });

    const average = key => (
        result.metrics.reduce((sum, p) => sum + p[key], 0) /
        result.metrics.length
    ).toFixed(2);

    document.getElementById("averages").textContent =
        `Average turnaround: ${average("turnaround")} | ` +
        `Average waiting: ${average("waiting")} | ` +
        `Average response: ${average("response")}`;

    const problems = Scheduler.verifySchedule(processes, result);
    const verification = document.getElementById("verification");
    verification.className = "verification" + (problems.length ? " fail" : "");
    verification.textContent = problems.length
        ? "Verification failed: " + problems.join(" ")
        : "Verification passed: exact bursts, no early start, no overlap, no negative waiting/response, no idle while a process was ready.";

    resultsSection.hidden = false;
}

function updateQuantumVisibility() {
    quantumContainer.hidden = algorithmSelect.value !== "RR";
}

algorithmSelect.addEventListener("change", updateQuantumVisibility);
updateQuantumVisibility();

document.getElementById("run-scheduler").addEventListener("click", () => {
    showError("");

    try {
        const quantum = Number(document.getElementById("quantum").value);
        const result = Scheduler.runAlgorithm(algorithmSelect.value, processes, quantum);
        renderResults(result);
    } catch (error) {
        showError(error.message);
        resetResults();
    }
});

