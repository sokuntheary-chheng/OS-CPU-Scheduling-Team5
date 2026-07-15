# OS CPU Scheduling Simulator — Team 5

A Python command-line simulator for five CPU scheduling algorithms:
**FCFS, SJF, SRT, Round Robin, and MLFQ**. It calculates Waiting Time,
Turnaround Time, and Response Time per process, prints an ASCII Gantt
chart, and compares all five algorithms side by side.

---

## Team Members

| Member | Name | Student ID | Algorithm(s) |
|--------|------|------------|--------------|
| A | Kong Sonphana | p20240063 | FCFS, SJF, SRT |
| B | Chheng Sokuntheary | p20240044 | Round Robin, MLFQ |

---

## Setup & Installation

**Requirements:** Python 3.8 or higher — no external libraries needed (standard library only).

```bash
# 1. Clone the repository
git clone https://github.com/sokuntheary-chheng/OS-CPU-Scheduling-Team5.git

# 2. Navigate into the project folder
cd OS-CPU-Scheduling-Team5

# 3. Run the simulator
python3 main.py
```

> **Windows users:** use `python main.py` instead of `python3 main.py` if Python 3 is your default.

---

## Project Structure

```
OS-CPU-Scheduling-Team5/
│
├── main.py        # CLI menu and entry point
├── process.py     # Process class, sample scenario, and input validation
├── display.py     # Gantt chart, metrics table, and metrics calculation
├── fcfs.py        # First Come First Serve
├── sjf.py         # Shortest Job First (Non-Preemptive)
├── srt.py         # Shortest Remaining Time (Preemptive)
├── rr.py          # Round Robin
├── mlfq.py        # Multilevel Feedback Queue
│
├── processes.csv  # Sample CSV input file
├── processes.json # Sample JSON input file
└── README.md      # This file
```

---

## How to Run Each Scheduler

When you launch `python3 main.py`, the simulator starts pre-loaded with the
sample scenario (P1–P4). You can immediately press `6` to run all algorithms
at once, or select any individual algorithm from the menu.

```
╔══════════════════════════════════════════════╗
║     OS CPU SCHEDULING SIMULATOR - TEAM 5     ║
╠══════════════════════════════════════════════╣
║  1. First Come First Serve (FCFS)            ║
║  2. Shortest Job First (SJF)                 ║
║  3. Shortest Remaining Time (SRT)            ║
║  4. Round Robin (RR)                         ║
║  5. Multilevel Feedback Queue (MLFQ)         ║
║  6. Run ALL algorithms (comparison)          ║
║  7. Change input (custom processes)          ║
║  8. Load processes from CSV file             ║
║  9. Load processes from JSON file            ║
║  0. Exit                                     ║
╚══════════════════════════════════════════════╝
```

| Option | What it does |
|--------|-------------|
| `1` | Runs FCFS on the current process set |
| `2` | Runs SJF (non-preemptive) |
| `3` | Runs SRT (preemptive, tick-by-tick) |
| `4` | Prompts for a time quantum (default 2), then runs Round Robin |
| `5` | Runs MLFQ with Q0 quantum=2, Q1 quantum=4, Q2=FCFS, aging threshold=10 |
| `6` | Runs all 5 algorithms and prints a side-by-side comparison table |
| `7` | Replaces the loaded processes with custom input from the terminal |
| `8` | Loads processes from a CSV file (see format below) |
| `9` | Loads processes from a JSON file (see format below) |
| `0` | Exits the simulator |

---

## Algorithm Descriptions

### 1. First Come First Serve (FCFS)
Processes are executed strictly in arrival order. Once a process starts, it
runs to completion — no preemption. If the CPU is idle (no process has arrived
yet), time advances to the next arrival. Simple and fair in ordering, but can
cause the "convoy effect" where short processes wait behind a long one.

### 2. Shortest Job First — SJF (Non-Preemptive)
At each scheduling decision, the process with the **shortest burst time** among
all currently arrived processes is selected next. Non-preemptive: once a process
starts, it runs to completion. Produces the minimum average waiting time for a
static process set, but can starve long processes if short ones keep arriving.
Ties are broken by arrival time, then by PID.

### 3. Shortest Remaining Time — SRT (Preemptive)
The preemptive version of SJF. At **every clock tick**, the process with the
shortest **remaining** burst time is selected. If a newly arrived process has
less remaining time than the current process, a context switch occurs immediately.
Simulated tick-by-tick for accuracy. `compress_gantt()` merges consecutive
same-PID ticks into readable Gantt segments. Best average turnaround time among
all algorithms for this scenario, but has high context-switch overhead.

### 4. Round Robin — RR (Preemptive)
Each process gets a fixed **time quantum** (default = 2) per turn. If a process
does not finish within its quantum, it is preempted and added to the **back** of
the ready queue. New arrivals during a quantum are enqueued **before** a
preempted process is re-added — this is standard RR convention and is intentional.
Managed with a `deque` for O(1) enqueue/dequeue. Quantum size directly affects
the trade-off between response time (smaller quantum = better) and throughput
(larger quantum = fewer context switches).

### 5. Multilevel Feedback Queue — MLFQ
Three-level queue structure with automatic demotion and aging-based promotion:

| Queue | Algorithm | Quantum |
|-------|-----------|---------|
| Q0 (Highest Priority) | Round Robin | 2 ticks |
| Q1 (Medium Priority)  | Round Robin | 4 ticks |
| Q2 (Lowest Priority)  | FCFS        | Run to completion |

- **New arrivals** always enter Q0.
- **Demotion:** if a process uses its full quantum in Q0, it moves to Q1; full quantum in Q1 moves it to Q2.
- **Aging (starvation prevention):** any process waiting ≥ 10 ticks in Q1 or Q2 is promoted one level up.
- **Design note:** a process always completes its current quantum slice before a higher-priority arrival is served (no mid-slice preemption). This is a documented scope decision, not a bug.

---

## Sample Input

### Default (loaded on launch)

| Process | Arrival Time | Burst Time |
|---------|-------------|-----------|
| P1      | 0           | 5         |
| P2      | 1           | 3         |
| P3      | 2           | 8         |
| P4      | 3           | 6         |

### CSV File Format (`processes.csv`)

```csv
pid,arrival,burst
P1,0,5
P2,1,3
P3,2,8
P4,3,6
```

Load with option `8` → enter filename: `processes.csv`

### JSON File Format (`processes.json`)

```json
[
  {"pid": "P1", "arrival": 0, "burst": 5},
  {"pid": "P2", "arrival": 1, "burst": 3},
  {"pid": "P3", "arrival": 2, "burst": 8},
  {"pid": "P4", "arrival": 3, "burst": 6}
]
```

Load with option `9` → enter filename: `processes.json`

### Custom Input (Option 7)

```
Enter number of processes: 4
Process 1 ID: P1
Arrival Time for P1: 0
Burst Time for P1: 5
... (repeat for each process)
```

---

## Sample Output

### FCFS Gantt Chart & Metrics (Option 1)

```
  Gantt Chart:
  -----------------------------------
  | P1  | P2  | P3  | P4  |
  -----------------------------------
  0     5     8     16    22
```

```
  Scheduling Metrics:
  PID    Arrival    Burst    Start    Finish    Waiting    Turnaround    Response
  ---------------------------------------------------------------------------------
  P1     0          5        0        5         0          5             0
  P2     1          3        5        8         4          7             4
  P3     2          8        8        16        6          14            6
  P4     3          6        16       22        13         19            13
  ---------------------------------------------------------------------------------
  Average                                       5.75       11.25         5.75
```

### Comparative Analysis (Option 6)

```
======================================================================
  COMPARATIVE ANALYSIS - Average Metrics
======================================================================
  Algorithm                      Avg Waiting     Avg Turnaround     Avg Response
  --------------------------------------------------------------------
  FCFS                           5.75            11.25              5.75
  SJF (Non-Preemptive)           5.25            10.75              5.25
  SRT (Preemptive)               5.00            10.50              4.25
  Round Robin (q=2)              9.75            15.25              2.00
  MLFQ (q0=2,q1=4)               9.25            14.75              1.50
======================================================================
```

> **[📸 ADD SCREENSHOT HERE]** — Insert a terminal screenshot of option 6 output after final run.

---

## Known Limitations

- **MLFQ does not preempt mid-slice** — a running process always finishes its current quantum even if a higher-priority process arrives during it. Documented as a deliberate scope decision.
- **SRT is tick-by-tick** (`O(total_time × n)`) — correct and sufficient for this assignment's scale, but not built for very large burst times.
- **Tie-breaking** across all algorithms falls back to Process ID order when burst times or arrival times are equal.
- **Custom input (option 7)** validates: ≥ 1 process, burst ≥ 1, arrival ≥ 0, no duplicate PIDs.

---
