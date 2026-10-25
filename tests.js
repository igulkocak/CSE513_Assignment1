// Run with:  node tests.js
const S = require("./scheduler.js");

const A = [
    { id: "P1", arrival: 0, burst: 8 },
    { id: "P2", arrival: 1, burst: 4 },
    { id: "P3", arrival: 2, burst: 2 },
    { id: "P4", arrival: 4, burst: 1 }
];
const B = [
    { id: "P1", arrival: 2, burst: 3 },
    { id: "P2", arrival: 2, burst: 1 },
    { id: "P3", arrival: 8, burst: 2 },
    { id: "P4", arrival: 9, burst: 1 }
];
// Custom 1: CPU idle between P1 and P2
const IDLE_CASE = [
    { id: "P1", arrival: 0, burst: 2 },
    { id: "P2", arrival: 5, burst: 3 }
];
// Custom 2: simultaneous arrivals at t=2 and a burst tie (P2 vs P3)
const TIE_CASE = [
    { id: "P1", arrival: 0, burst: 2 },
    { id: "P2", arrival: 2, burst: 3 },
    { id: "P3", arrival: 2, burst: 3 },
    { id: "P4", arrival: 2, burst: 1 }
];
// Custom 3: SRTF preempts P1 at t=2; at t=3 P3 ties P2 (1 vs 1) and must NOT preempt
const PREEMPT_CASE = [
    { id: "P1", arrival: 0, burst: 7 },
    { id: "P2", arrival: 2, burst: 2 },
    { id: "P3", arrival: 3, burst: 1 }
];

// metrics are [completion, turnaround, waiting, response]
const cases = [
    // ---- Workload A ----
    { name: "A / FCFS", procs: A, algo: "FCFS",
      timeline: "P1:0-8 P2:8-12 P3:12-14 P4:14-15",
      metrics: { P1: [8, 8, 0, 0], P2: [12, 11, 7, 7], P3: [14, 12, 10, 10], P4: [15, 11, 10, 10] } },
    { name: "A / SJF", procs: A, algo: "SJF",
      timeline: "P1:0-8 P4:8-9 P3:9-11 P2:11-15",
      metrics: { P1: [8, 8, 0, 0], P2: [15, 14, 10, 10], P3: [11, 9, 7, 7], P4: [9, 5, 4, 4] } },
    { name: "A / SRTF", procs: A, algo: "SRTF",
      timeline: "P1:0-1 P2:1-2 P3:2-4 P4:4-5 P2:5-8 P1:8-15",
      metrics: { P1: [15, 15, 7, 0], P2: [8, 7, 3, 0], P3: [4, 2, 0, 0], P4: [5, 1, 0, 0] } },
    { name: "A / RR q=2", procs: A, algo: "RR", quantum: 2,
      timeline: "P1:0-2 P2:2-4 P3:4-6 P1:6-8 P4:8-9 P2:9-11 P1:11-13 P1:13-15",
      metrics: { P1: [15, 15, 7, 0], P2: [11, 10, 6, 1], P3: [6, 4, 2, 2], P4: [9, 5, 4, 4] } },

    // ---- Workload B ----
    { name: "B / FCFS", procs: B, algo: "FCFS",
      timeline: "IDLE:0-2 P1:2-5 P2:5-6 IDLE:6-8 P3:8-10 P4:10-11",
      metrics: { P1: [5, 3, 0, 0], P2: [6, 4, 3, 3], P3: [10, 2, 0, 0], P4: [11, 2, 1, 1] } },
    { name: "B / SJF", procs: B, algo: "SJF",
      timeline: "IDLE:0-2 P2:2-3 P1:3-6 IDLE:6-8 P3:8-10 P4:10-11",
      metrics: { P1: [6, 4, 1, 1], P2: [3, 1, 0, 0], P3: [10, 2, 0, 0], P4: [11, 2, 1, 1] } },
    { name: "B / SRTF (same as SJF)", procs: B, algo: "SRTF",
      timeline: "IDLE:0-2 P2:2-3 P1:3-6 IDLE:6-8 P3:8-10 P4:10-11",
      metrics: { P1: [6, 4, 1, 1], P2: [3, 1, 0, 0], P3: [10, 2, 0, 0], P4: [11, 2, 1, 1] } },
    { name: "B / RR q=2", procs: B, algo: "RR", quantum: 2,
      timeline: "IDLE:0-2 P1:2-4 P2:4-5 P1:5-6 IDLE:6-8 P3:8-10 P4:10-11",
      metrics: { P1: [6, 4, 1, 0], P2: [5, 3, 2, 2], P3: [10, 2, 0, 0], P4: [11, 2, 1, 1] } },

    // ---- Custom 1: idle time ----
    { name: "Idle / FCFS", procs: IDLE_CASE, algo: "FCFS",
      timeline: "P1:0-2 IDLE:2-5 P2:5-8",
      metrics: { P1: [2, 2, 0, 0], P2: [8, 3, 0, 0] } },
    { name: "Idle / SRTF", procs: IDLE_CASE, algo: "SRTF",
      timeline: "P1:0-2 IDLE:2-5 P2:5-8",
      metrics: { P1: [2, 2, 0, 0], P2: [8, 3, 0, 0] } },
    { name: "Idle / RR q=2 (consecutive slices stay separate)", procs: IDLE_CASE, algo: "RR", quantum: 2,
      timeline: "P1:0-2 IDLE:2-5 P2:5-7 P2:7-8",
      metrics: { P1: [2, 2, 0, 0], P2: [8, 3, 0, 0] } },

    // ---- Custom 2: simultaneous arrivals + tie ----
    { name: "Tie / FCFS", procs: TIE_CASE, algo: "FCFS",
      timeline: "P1:0-2 P2:2-5 P3:5-8 P4:8-9",
      metrics: { P1: [2, 2, 0, 0], P2: [5, 3, 0, 0], P3: [8, 6, 3, 3], P4: [9, 7, 6, 6] } },
    { name: "Tie / SJF (P4 shortest, then P2 before P3 by input order)", procs: TIE_CASE, algo: "SJF",
      timeline: "P1:0-2 P4:2-3 P2:3-6 P3:6-9",
      metrics: { P1: [2, 2, 0, 0], P2: [6, 4, 1, 1], P3: [9, 7, 4, 4], P4: [3, 1, 0, 0] } },
    { name: "Tie / RR q=2 (simultaneous arrivals enter in input order)", procs: TIE_CASE, algo: "RR", quantum: 2,
      timeline: "P1:0-2 P2:2-4 P3:4-6 P4:6-7 P2:7-8 P3:8-9",
      metrics: { P1: [2, 2, 0, 0], P2: [8, 6, 3, 0], P3: [9, 7, 4, 2], P4: [7, 5, 4, 4] } },

    // ---- Custom 3: SRTF preemption ----
    { name: "Preempt / SRTF", procs: PREEMPT_CASE, algo: "SRTF",
      timeline: "P1:0-2 P2:2-4 P3:4-5 P1:5-10",
      metrics: { P1: [10, 10, 3, 0], P2: [4, 2, 0, 0], P3: [5, 2, 1, 1] } },
    { name: "Preempt / SJF (no preemption, for contrast)", procs: PREEMPT_CASE, algo: "SJF",
      timeline: "P1:0-7 P3:7-8 P2:8-10",
      metrics: { P1: [7, 7, 0, 0], P2: [10, 8, 6, 6], P3: [8, 5, 4, 4] } }
];

const fmt = tl => tl.map(i => `${i.id}:${i.start}-${i.end}`).join(" ");
let failed = 0;

function fail(name, msg) {
    failed++;
    console.log(`FAIL  ${name}\n      ${msg}`);
}

// ---- 1. Hand-calculated expectations ----
for (const c of cases) {
    const result = S.runAlgorithm(c.algo, c.procs, c.quantum);
    const before = failed;

    if (fmt(result.timeline) !== c.timeline) {
        fail(c.name, `timeline\n      expected ${c.timeline}\n      got      ${fmt(result.timeline)}`);
    }
    for (const m of result.metrics) {
        const got = [m.completion, m.turnaround, m.waiting, m.response].join(",");
        const exp = c.metrics[m.id].join(",");
        if (got !== exp) fail(c.name, `${m.id} metrics expected [${exp}] got [${got}]`);
    }
    const problems = S.verifySchedule(c.procs, result);
    if (problems.length) fail(c.name, "verifySchedule: " + problems.join(" | "));

    if (failed === before) console.log(`ok    ${c.name}`);
}

// ---- 2. Property test: random workloads, all algorithms, all five properties ----
let seed = 12345;
const rand = n => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };

for (let t = 0; t < 1000; t++) {
    const n = 1 + rand(6);
    const procs = Array.from({ length: n }, (_, i) => ({
        id: `P${i + 1}`, arrival: rand(11), burst: 1 + rand(6)
    }));
    const quantum = 1 + rand(4);

    for (const algo of ["FCFS", "SJF", "SRTF", "RR"]) {
        const result = S.runAlgorithm(algo, procs, quantum);
        const problems = S.verifySchedule(procs, result);
        if (problems.length) {
            fail(`random #${t} ${algo}`, `${JSON.stringify(procs)} q=${quantum}: ${problems.join(" | ")}`);
        }
    }
    // SJF and SRTF must agree on total completion span (work-conserving)
    const endA = S.runSJF(procs).timeline.at(-1).end;
    const endB = S.runSRTF(procs).timeline.at(-1).end;
    if (endA !== endB) fail(`random #${t}`, `SJF ends ${endA}, SRTF ends ${endB}`);
}
if (failed === 0) console.log("ok    1000 random workloads x 4 algorithms satisfy all properties");

console.log(failed === 0 ? "\nAll tests passed." : `\n${failed} failure(s).`);
process.exit(failed === 0 ? 0 : 1);
