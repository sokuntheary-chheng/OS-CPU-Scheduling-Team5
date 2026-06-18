# OS CPU Scheduling Simulator — Team 5

> A Python-based CPU scheduling simulator implementing FCFS, SJF, SRT, Round Robin, and MLFQ, with ASCII Gantt chart output and comparative metrics analysis.

---

## Team Members

| Member | Name     | Student ID | Algorithm       |
|--------|----------|------------|-----------------|
| A      | Member A | id_a       | FCFS            |
| B      | Member B | id_b       | SJF             |
| C      | Member C | id_c       | SRT             |
| D      | D        | d_id       | Round Robin, MLFQ |

> **Edit here:** Replace Member A/B/C/D and id_a/id_b/id_c/d_id with real names and IDs.

---

## Project Structure

```
OS-CPU-Scheduling-Team5/
├── main.py        — Main entry point / interactive menu
├── process.py     — Shared Process class and sample data
├── display.py     — Gantt chart, metrics table, comparison utilities
├── fcfs.py        — First Come First Serve (Member A)
├── sjf.py         — Shortest Job First (Member B)
├── srt.py         — Shortest Remaining Time (Member C)
├── rr.py          — Round Robin (Member D)
└── mlfq.py        — Multilevel Feedback Queue (Member D)
```

---

## Setup & Installation

**Requirements:** Python 3.7 or higher. No external libraries needed.

```bash
# Clone the repository
git clone https://github.com/sokuntheary-chheng/OS-CPU-Scheduling-Team5.git
cd OS-CPU-Scheduling-Team5

# Run the simulator
python main.py
```

---

## How to Run Each Scheduler

### Interactive Menu (recommended)

```bash
python main.py
```

Then choose from the menu:
- `1` — FCFS
- `2` — SJF
- `3` — SRT
- `4` — Round Robin (prompts for quantum)
- `5` — MLFQ
- `6` — Run ALL and compare
- `7` — Enter custom processes
- `0` — Exit

### Run a single algorithm directly (Python)

```python
from process import get_sample_processes
from rr import run_rr
from mlfq import run_mlfq

processes = get_sample_processes()
run_rr(processes, quantum=2)
run_mlfq(processes, q0=2, q1=4)
```

---

## Algorithms Implemented

### 1. First Come First Serve (FCFS) — `fcfs.py`
Processes execute in arrival order. Non-preemptive. Simple but can cause the **convoy effect** where short processes wait behind long ones.

### 2. Shortest Job First (SJF) — `sjf.py`
At each scheduling point, the arrived process with the shortest burst time runs next. Non-preemptive. Minimizes average waiting time but can cause **starvation** of long processes.

### 3. Shortest Remaining Time (SRT) — `srt.py`
Preemptive version of SJF. At every tick, if a newly arrived process has shorter remaining time than the running process, a context switch occurs. Best average turnaround time but high context switch overhead.

### 4. Round Robin (RR) — `rr.py`
Each process receives a fixed time quantum (default: 2). If not finished, it is preempted and re-queued. Ensures **fairness** and great response time. Higher average waiting time for short jobs.

### 5. Multilevel Feedback Queue (MLFQ) — `mlfq.py`
Three-level queue system:
- **Q0**: Round Robin, quantum = 2 (highest priority, new arrivals)
- **Q1**: Round Robin, quantum = 4
- **Q2**: FCFS (runs to completion)

Processes are **demoted** if they use their full quantum. **Aging** promotes waiting processes to prevent starvation (threshold: 10 ticks).

---

## Sample Scenario

**Input:**
| PID | Arrival Time | Burst Time |
|-----|-------------|------------|
| P1  | 0           | 5          |
| P2  | 1           | 3          |
| P3  | 2           | 8          |
| P4  | 3           | 6          |

**Config:** RR Quantum = 2, MLFQ: Q0=2, Q1=4, Q2=FCFS

**Sample Output (FCFS):**
```
  Gantt Chart:
  -------------------------
  |  P1 |  P2 |  P3 |  P4 |
  -------------------------
  0     5     8     16    22

  PID    Arrival    Burst    Waiting    Turnaround    Response
  P1     0          5        0          5             0
  P2     1          3        4          7             4
  P3     2          8        6          14            6
  P4     3          6        13         19            13
  Average                    5.75       11.25         5.75
```

**Comparative Results:**
| Algorithm     | Avg Waiting | Avg Turnaround | Avg Response |
|---------------|-------------|----------------|--------------|
| FCFS          | 5.75        | 11.25          | 5.75         |
| SJF           | 5.25        | 10.75          | 5.25         |
| SRT           | 5.00        | 10.50          | 4.25         |
| RR (q=2)      | 9.75        | 15.25          | 2.00         |
| MLFQ          | 9.25        | 14.75          | 1.50         |

---

## Key Findings

- **SRT** achieves the lowest average waiting and turnaround times
- **MLFQ** achieves the best average response time (1.50), even better than pure RR
- **FCFS** is the simplest but performs worst on response time for late-arriving processes
- **RR and MLFQ** trade higher waiting time for significantly better responsiveness