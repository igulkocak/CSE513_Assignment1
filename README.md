# CPU Scheduling Simulator

CSE513 – Assignment 1. A browser-based simulator for four CPU scheduling
algorithms: FCFS, SJF (non-preemptive), SRTF (preemptive) and Round Robin
with a configurable time quantum.

Live version: <PASTE THE PUBLIC URL HERE>

## Running locally

No build step, backend or database is needed.

1. Download or unzip the project folder.
2. Open `index.html` in any modern browser (Chrome, Firefox, Edge, Safari).

Optionally, serve the folder with any static server, for example:

```
python3 -m http.server 8000
```

and open http://localhost:8000.

## Running the tests

Requires Node.js 18 or newer (only for the tests; the website itself has no dependencies).

```
node tests.js
```

The test runner checks:

- Workloads A and B for all four algorithms (RR with quantum 2) against
  hand-calculated timelines and metrics.
- Three additional workloads: CPU idle time, simultaneous arrivals with a
  scheduling tie, and an SRTF preemption (including an equal-remaining-time
  case that must not preempt).
- 1000 random workloads for every algorithm, verifying the five required
  properties: exact CPU burst per process, no process runs before its
  arrival, no overlap on the single CPU, nonnegative waiting and response
  times, and no CPU idle while a process is ready.

The same property checks run in the browser after every simulation; the
result is shown under "Average Metrics".

## Files

| File | Purpose |
|---|---|
| `index.html` | Page structure |
| `style.css` | Styling |
| `scheduler.js` | Scheduling algorithms and `verifySchedule` (no DOM access) |
| `script.js` | User interface: add/edit/remove processes, run, render results |
| `tests.js` | Node test runner |

## Model and rules

- One CPU; each process has a single CPU burst and performs no I/O.
- Context switches take zero time.
- Arrival times are nonnegative integers; bursts and the quantum are positive integers.
- Process IDs must be unique. Invalid input is rejected with a message.
  Arrival time and burst are limited to 10000.
- Ties are broken by earlier arrival, then by earlier position in the input list.
- SRTF preempts only when another process has a strictly shorter remaining time.
- Round Robin: processes arriving at a quantum boundary join the queue before
  the preempted process; a finished process never rejoins. Each time slice is
  drawn as its own block, so quantum boundaries stay visible even when the
  same process runs consecutive slices.
- Intervals are half-open: a process running from 2 to 5 receives 3 units.
- Idle intervals are shown as `IDLE`.

## Limitations

- The simulator models scheduling policies. It does not reproduce the
  Linux/Ubuntu scheduler.
- Burst lengths are exact and known in advance (a real OS must estimate them).
- Only integer times; no I/O bursts, priorities, multiple CPUs or context-switch cost.
- Data is not saved: reloading the page clears the process list.
