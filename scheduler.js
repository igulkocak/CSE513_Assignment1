/*
 * scheduler.js - pure scheduling logic (no DOM access).
 * Works in the browser (window.Scheduler) and in Node (require("./scheduler.js")).
 *
 * Every run* function takes an array of { id, arrival, burst } and returns
 *   { timeline: [{ id, start, end }], metrics: [{ id, arrival, burst, start,
 *     completion, turnaround, waiting, response }] }
 * Metrics are always returned in INPUT order.
 */
(function (root) {
    "use strict";

    function prepare(processes, name) {
        if (processes.length === 0) {
            throw new Error(`Add at least one process before running ${name}.`);
        }
        return processes.map((p, i) => ({
            ...p,
            inputIndex: i,
            remaining: p.burst,
            firstStart: null,
            completion: null
        }));
    }

    function toMetrics(jobs) {
        return jobs.map(p => ({
            id: p.id,
            arrival: p.arrival,
            burst: p.burst,
            start: p.firstStart,
            completion: p.completion,
            turnaround: p.completion - p.arrival,
            waiting: p.completion - p.arrival - p.burst,
            response: p.firstStart - p.arrival
        }));
    }

    function addInterval(timeline, id, start, end) {
        const last = timeline[timeline.length - 1];
        if (last && last.id === id && last.end === start) {
            last.end = end;
        } else {
            timeline.push({ id, start, end });
        }
    }

    function runFCFS(processes) {
        const jobs = prepare(processes, "FCFS");
        const timeline = [];
        let time = 0;

        const ordered = [...jobs].sort(
            (a, b) => a.arrival - b.arrival || a.inputIndex - b.inputIndex
        );

        for (const p of ordered) {
            if (time < p.arrival) {
                timeline.push({ id: "IDLE", start: time, end: p.arrival });
                time = p.arrival;
            }
            p.firstStart = time;
            time += p.burst;
            p.completion = time;
            p.remaining = 0;
            timeline.push({ id: p.id, start: p.firstStart, end: time });
        }

        return { timeline, metrics: toMetrics(jobs) };
    }

    function runSJF(processes) {
        const jobs = prepare(processes, "SJF");
        const pending = [...jobs];
        const timeline = [];
        let time = 0;

        while (pending.length) {
            const ready = pending.filter(p => p.arrival <= time);

            if (!ready.length) {
                const nextArrival = Math.min(...pending.map(p => p.arrival));
                timeline.push({ id: "IDLE", start: time, end: nextArrival });
                time = nextArrival;
                continue;
            }

            ready.sort((a, b) =>
                a.burst - b.burst ||
                a.arrival - b.arrival ||
                a.inputIndex - b.inputIndex
            );

            const p = ready[0];
            pending.splice(pending.indexOf(p), 1);

            p.firstStart = time;
            time += p.burst;
            p.completion = time;
            p.remaining = 0;
            timeline.push({ id: p.id, start: p.firstStart, end: time });
        }

        return { timeline, metrics: toMetrics(jobs) };
    }

    function runSRTF(processes) {
        const jobs = prepare(processes, "SRTF");
        const timeline = [];
        let time = 0;
        let completed = 0;
        let current = null;

        while (completed < jobs.length) {
            const ready = jobs.filter(p => p.arrival <= time && p.remaining > 0);

            if (ready.length === 0) {
                const nextArrival = Math.min(
                    ...jobs.filter(p => p.remaining > 0).map(p => p.arrival)
                );
                addInterval(timeline, "IDLE", time, nextArrival);
                time = nextArrival;
                current = null;
                continue;
            }

            ready.sort((a, b) =>
                a.remaining - b.remaining ||
                a.arrival - b.arrival ||
                a.inputIndex - b.inputIndex
            );
            const shortest = ready[0];

            // Preempt only when another process is STRICTLY shorter.
            if (current === null || current.remaining > shortest.remaining) {
                current = shortest;
            }

            if (current.firstStart === null) current.firstStart = time;

            addInterval(timeline, current.id, time, time + 1);
            current.remaining--;
            time++;

            if (current.remaining === 0) {
                current.completion = time;
                completed++;
                current = null;
            }
        }

        return { timeline, metrics: toMetrics(jobs) };
    }

    function runRR(processes, quantum) {
        if (!Number.isInteger(quantum) || quantum <= 0) {
            throw new Error("Time quantum must be a positive integer.");
        }
        const jobs = prepare(processes, "RR");

        const arrivals = [...jobs].sort(
            (a, b) => a.arrival - b.arrival || a.inputIndex - b.inputIndex
        );

        const timeline = [];   // one entry per slice: quantum boundaries stay visible
        const queue = [];
        let time = 0;
        let nextArrival = 0;
        let completed = 0;

        function enqueueArrivals(upToTime) {
            while (
                nextArrival < arrivals.length &&
                arrivals[nextArrival].arrival <= upToTime
            ) {
                queue.push(arrivals[nextArrival]);
                nextArrival++;
            }
        }

        while (completed < jobs.length) {
            enqueueArrivals(time);

            if (queue.length === 0) {
                const nextTime = arrivals[nextArrival].arrival;
                timeline.push({ id: "IDLE", start: time, end: nextTime });
                time = nextTime;
                enqueueArrivals(time);
            }

            const current = queue.shift();
            if (current.firstStart === null) current.firstStart = time;

            const runTime = Math.min(quantum, current.remaining);
            const endTime = time + runTime;
            timeline.push({ id: current.id, start: time, end: endTime });

            // Arrivals at the quantum boundary join BEFORE the preempted process.
            enqueueArrivals(endTime);

            current.remaining -= runTime;
            time = endTime;

            if (current.remaining === 0) {
                current.completion = time;
                completed++;
            } else {
                queue.push(current);
            }
        }

        return { timeline, metrics: toMetrics(jobs) };
    }

    function runAlgorithm(name, processes, quantum) {
        switch (name) {
            case "FCFS": return runFCFS(processes);
            case "SJF":  return runSJF(processes);
            case "SRTF": return runSRTF(processes);
            case "RR":   return runRR(processes, quantum);
            default: throw new Error("Please select a valid algorithm.");
        }
    }

    /*
     * Checks the five properties required by the assignment (plus timeline
     * consistency). Returns an array of problem strings; empty array = OK.
     */
    function verifySchedule(processes, result) {
        const problems = [];
        const { timeline, metrics } = result;

        // Timeline structure: starts at 0, contiguous, no overlap, positive length.
        let expectedStart = 0;
        for (const iv of timeline) {
            if (iv.end <= iv.start) {
                problems.push(`Empty or negative interval ${iv.id} ${iv.start}-${iv.end}.`);
            }
            if (iv.start < expectedStart) {
                problems.push(`Overlap: ${iv.id} starts at ${iv.start} before ${expectedStart}.`);
            } else if (iv.start > expectedStart) {
                problems.push(`Gap in timeline between ${expectedStart} and ${iv.start}.`);
            }
            expectedStart = iv.end;
        }

        for (const p of processes) {
            const runs = timeline.filter(iv => iv.id === p.id);
            const total = runs.reduce((s, iv) => s + (iv.end - iv.start), 0);
            const m = metrics.find(x => x.id === p.id);

            // 1. Exactly the specified burst.
            if (total !== p.burst) {
                problems.push(`${p.id} received ${total} units instead of ${p.burst}.`);
            }
            // 2. Never before arrival.
            if (runs.some(iv => iv.start < p.arrival)) {
                problems.push(`${p.id} runs before its arrival time ${p.arrival}.`);
            }
            if (!m) {
                problems.push(`${p.id} is missing from the metrics.`);
                continue;
            }
            // Metrics must agree with the timeline.
            if (runs.length && m.start !== runs[0].start) {
                problems.push(`${p.id}: first start ${m.start} does not match timeline (${runs[0].start}).`);
            }
            if (runs.length && m.completion !== runs[runs.length - 1].end) {
                problems.push(`${p.id}: completion ${m.completion} does not match timeline.`);
            }
            // 4. Nonnegative waiting and response.
            if (m.waiting < 0 || m.response < 0) {
                problems.push(`${p.id} has a negative waiting or response time.`);
            }
            // 5. CPU never idle while this process is ready.
            for (const iv of timeline.filter(x => x.id === "IDLE")) {
                if (p.arrival < iv.end && m.completion > iv.start) {
                    problems.push(`CPU idle ${iv.start}-${iv.end} while ${p.id} is ready.`);
                }
            }
        }

        return problems;   // (3. "no overlap" is covered by the timeline structure check)
    }

    const api = { runFCFS, runSJF, runSRTF, runRR, runAlgorithm, verifySchedule };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    } else {
        root.Scheduler = api;
    }
})(typeof window !== "undefined" ? window : globalThis);
