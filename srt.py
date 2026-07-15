# =============================================================================
# srt.py - Shortest Remaining Time (Preemptive SJF)
# OS CPU Scheduling Simulator - Team 5
# Author: Member C (id_c)
# =============================================================================
# Algorithm Logic:
#   Preemptive version of SJF. At every clock tick, the process with the
#   shortest REMAINING burst time is selected.
#   If a new process arrives with shorter remaining time than the running process,
#   a context switch occurs (preemption).
#   Simulation runs tick-by-tick to accurately capture all preemption points.
#
# Note on performance: this is an O(total_time * n) simulation, which is fine
# for coursework-sized inputs (bursts in the tens/hundreds) but would need a
# heap-based event simulation to scale to very large burst times.
# =============================================================================

import copy
from display import print_gantt_chart, print_metrics_table, compute_metrics


def srt(processes):
    """
    Shortest Remaining Time (preemptive) scheduling.
    Args:
        processes: list of Process objects
    Returns:
        (gantt, processes_copy)
    """
    procs = copy.deepcopy(processes)

    gantt = []          # (pid, start, end)
    current_time = 0
    completed = []
    active = []         # processes currently in ready queue

    last_pid = None
    segment_start = 0

    while len(completed) < len(procs):
        # Add newly arrived processes to active queue
        for p in procs:
            if p.arrival_time == current_time and p not in active and p not in completed:
                active.append(p)

        if not active:
            current_time += 1
            continue

        # Select process with shortest remaining time; tie-break by arrival, then PID
        chosen = min(active, key=lambda p: (p.remaining_time, p.arrival_time, p.pid))

        # Record response time on first execution
        if chosen.start_time == -1:
            chosen.start_time = current_time

        # If process changes, close previous Gantt segment
        if last_pid != chosen.pid:
            if last_pid is not None:
                gantt.append((last_pid, segment_start, current_time))
            segment_start = current_time
            last_pid = chosen.pid

        # Execute for 1 tick
        chosen.remaining_time -= 1
        current_time += 1

        # Add any processes arriving at new current_time
        for p in procs:
            if p.arrival_time == current_time and p not in active and p not in completed:
                active.append(p)

        # Check if process finished
        if chosen.remaining_time == 0:
            chosen.finish_time = current_time
            active.remove(chosen)
            completed.append(chosen)
            # Close current Gantt segment
            gantt.append((chosen.pid, segment_start, current_time))
            last_pid = None

    compute_metrics(completed)
    completed.sort(key=lambda p: p.pid)
    return gantt, completed


def compress_gantt(gantt):
    """Merges consecutive identical PID entries in Gantt for cleaner output."""
    if not gantt:
        return gantt
    merged = [gantt[0]]
    for (pid, start, end) in gantt[1:]:
        if pid == merged[-1][0] and start == merged[-1][2]:
            merged[-1] = (pid, merged[-1][1], end)
        else:
            merged.append((pid, start, end))
    return merged


def run_srt(processes):
    """Entry point: runs SRT and prints results."""
    print("\n" + "=" * 60)
    print("  SHORTEST REMAINING TIME (SRT) - Preemptive")
    print("=" * 60)
    gantt, procs = srt(processes)
    gantt = compress_gantt(gantt)
    print_gantt_chart(gantt)
    print_metrics_table(procs)
    return gantt, procs