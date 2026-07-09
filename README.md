# OS CPU Scheduling Simulator — Team 5

A Python command-line simulator for five CPU scheduling algorithms:
**FCFS, SJF, SRT, Round Robin, and MLFQ**. It calculates Waiting Time,
Turnaround Time, and Response Time per process, prints an ASCII Gantt
chart, and compares all five algorithms side by side.

```bash
git clone https://github.com/sokuntheary-chheng/OS-CPU-Scheduling-Team5.git
cd OS-CPU-Scheduling-Team5
python3 main.py
```

No installs needed — standard library only. Requires Python 3.8+.

---

## Project Structure

```
main.py        # CLI menu / entry point
process.py     # Process class + sample scenario + input validation
display.py     # Gantt chart + metrics table + metrics calculation
fcfs.py        # First Come First Serve
sjf.py         # Shortest Job First
srt.py         # Shortest Remaining Time
rr.py          # Round Robin
mlfq.py        # Multilevel Feedback Queue
```

---

## Team & Task Division

| Member | Name | Student ID | Algorithm(s) |
|--------|------|------------|--------------|
| A | Kong Sonphana | | FCFS, SJF, SRT |
| B | Chheng Sokuntheary | p20240044 | Round Robin, MLFQ |

**What "owning" an algorithm means, for everyone:**

1. `git pull` the latest code.
2. Open your file(s) and read `process.py` + `display.py` first — every
   algorithm shares the `Process` class and the metrics/Gantt-printing
   functions, so don't duplicate that logic inside your own file.
3. Run `python3 main.py`, pick your algorithm's menu option, and check
   your output against the **Sample Output** table below.
4. Write your subsection of the **Project Report** (Section 3 — design and
   logic for your algorithm(s)).
5. Be ready to explain your code on camera for the video presentation.

### Member A — FCFS, SJF
- Files: `fcfs.py`, `sjf.py`, `srt.py`
- FCFS: processes run strictly in arrival order, no preemption.
- SJF: shortest *burst* time among arrived processes runs next (non-preemptive — once it starts, it finishes). Note: SJF can starve long processes; that's expected, not a bug.
- Report: write Section 3.2 (FCFS) and 3.3 (SJF).

- Preemptive version of SJF — re-checks every tick which process has the least *remaining* time. `compress_gantt()` merges the tick-by-tick trace into readable Gantt segments; don't remove that call.
- Report: write Section 3.4 (SRT), including why it needs tick-by-tick simulation.

### Member C — Round Robin
- File: `rr.py`
- Fixed time quantum per turn, circular ready queue (`deque`). New arrivals join the queue before a preempted process gets re-added — that's intentional, matches standard RR convention.
- Try changing the quantum (menu option 4 prompts for it) and see how it affects average waiting vs. response time.
- Report: write Section 3.5 (Round Robin).

### Member D (Chheng Sokuntheary) — MLFQ
- File: `mlfq.py`
- 3 queues: Q0 = RR(quantum 2), Q1 = RR(quantum 4), Q2 = FCFS. Demotes a process that uses its full quantum; promotes ("ages") a process that's waited 10+ ticks in Q1/Q2 back up one level.
- Already reviewed and fixed: quantum validation (prevents an infinite loop if quantum ≤ 0), empty-input guard, and an audited (not actually broken, but clarified) aging function — see comments at the top of `mlfq.py` for details.
- Note: MLFQ does **not** interrupt a process mid-slice if a higher-priority process arrives — documented as a deliberate scope decision in the code comments, not a bug.
- Report: write Section 3.6 (MLFQ) — this is one of the two "complex algorithms" the video needs a walkthrough of.

---

## How to Run

```
1. FCFS
2. SJF
3. SRT
4. Round Robin       (asks for time quantum, default 2)
5. MLFQ               (Q0 quantum=2, Q1 quantum=4, aging threshold=10)
6. Run ALL algorithms (comparison table)
7. Enter custom processes (replaces the default sample scenario)
0. Exit
```

The simulator starts pre-loaded with the sample scenario below, so you can
hit `6` immediately after launch and see every algorithm's results with no
typing required.

## Sample Scenario (default on launch)

| Process | Arrival | Burst |
|---------|---------|-------|
| P1 | 0 | 5 |
| P2 | 1 | 3 |
| P3 | 2 | 8 |
| P4 | 3 | 6 |

## Sample Output (option 6)

```
COMPARATIVE ANALYSIS - Average Metrics
======================================================================
Algorithm                      Avg Waiting     Avg Turnaround     Avg Response
----------------------------------------------------------------------
FCFS                           5.75            11.25              5.75
SJF (Non-Preemptive)           5.25            10.75              5.25
SRT (Preemptive)               5.00            10.50              4.25
Round Robin (q=2)              9.75            15.25              2.00
MLFQ (q0=2,q1=4)               9.25            14.75              1.50
======================================================================
```

If your numbers don't match this table after pulling the latest code,
something changed — flag it in the group chat before writing your report
section, since the report's data needs to match what the code actually
produces.

---

## Before Final Submission (everyone)

- [ ] Names + Student IDs filled in above and in the report title page
- [ ] Re-run `python3 main.py` → option `6` on a fresh pull, confirm it still matches the Sample Output table
- [ ] Repo name: `OS-CPU-Scheduling-Team5`
- [ ] Report filename: `CPU_Scheduling_Report_Team5.pdf`
- [ ] YouTube title: `OS CPU Scheduling Project - Team5`, everyone speaks in it
- [ ] Report PDF (with clickable Git + YouTube links on the title page) submitted to Moodle
- [ ] Each member submits their peer evaluation privately

---

## Known Limitations (worth mentioning in the report, not hiding)

- MLFQ doesn't preempt mid-slice — a process always finishes its current quantum even if a higher-priority process arrives during it.
- SRT is tick-by-tick (`O(total_time × n)`), fine for this assignment's scale but not built for very large burst times.
- All tie-breaks (equal burst/remaining time, equal arrival) fall back to Process ID order.
- Custom input (option 7) validates: ≥1 process, burst ≥ 1, arrival ≥ 0, no duplicate PIDs.