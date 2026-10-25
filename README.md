# CPU Scheduling Simulator

**CSE513 – Assignment 1**

A browser-based simulator for four CPU scheduling algorithms: FCFS, SJF (non-preemptive), SRTF (preemptive), and Round Robin with a configurable time quantum.

## Live Demo

**[Open the CPU Scheduling Simulator](https://igulkocak.github.io/CSE513_Assignment1/)**

## Features

- Add, edit, and remove processes.
- Configure process IDs, arrival times, and CPU burst times.
- Simulate four CPU scheduling algorithms:
  - First-Come, First-Served (FCFS)
  - Shortest Job First (SJF, non-preemptive)
  - Shortest Remaining Time First (SRTF, preemptive)
  - Round Robin (RR) with a configurable time quantum
- Load predefined example workloads.
- Visualize execution timelines using a Gantt chart.
- View turnaround, waiting, and response times for each process.
- Calculate average scheduling metrics.
- Verify simulation results.

## Running Locally

No build step, backend, or database is required.

1. Clone or download this repository.
2. Open `index.html` in a web browser.
3. Add processes or load an example workload.
4. Select a scheduling algorithm and click **Run Simulation**.

## Project Structure

| File | Description |
|---|---|
| `index.html` | Application structure and user interface |
| `style.css` | Layout and visual styling |
| `script.js` | User interactions and result rendering |
| `scheduler.js` | Scheduling algorithms and schedule verification |
| `tests.js` | Scheduling test cases |
| `README.md` | Project documentation |

## Technologies

- HTML
- CSS
- JavaScript
- GitHub Pages

## Course

CSE513 – Advanced Topics in Operating Systems  
Assignment 1: CPU Scheduling Simulator
