# =============================================================================
# fcfs.py - First Come First Serve (Non-Preemptive)
# OS CPU Scheduling Simulator - Team 5
# Author: Member A (id_a)
# =============================================================================
# Algorithm Logic:
#   Processes are executed in the order they arrive.
#   Once a process starts, it runs to completion (non-preemptive).
#   If CPU is idle (no process has arrived yet), time advances to next arrival.
# =============================================================================

import copy
from display import print_gantt_chart, print_metrics_table, compute_metrics


def fcfs(processes):
    """
    First Come First Serve scheduling.
    Args:
        processes: list of Process objects (will be deep-copied, originals untouched)
    Returns:
        (gantt, processes_copy) where gantt = list of (pid, start, end) tuples
    """
    procs = copy.deepcopy(processes)

    # Sort by arrival time; ties broken by PID
    procs.sort(key=lambda p: (p.arrival_time, p.pid))

    gantt = []
    current_time = 0

    for p in procs:
        # If CPU is idle, jump to process arrival
        if current_time < p.arrival_time:
            current_time = p.arrival_time

        p.start_time  = current_time
        p.finish_time = current_time + p.burst_time
        gantt.append((p.pid, p.start_time, p.finish_time))
        current_time  = p.finish_time

    compute_metrics(procs)
    return gantt, procs


def run_fcfs(processes):
    """Entry point: runs FCFS and prints results."""
    print("\n" + "=" * 60)
    print("  FIRST COME FIRST SERVE (FCFS)")
    print("=" * 60)
    gantt, procs = fcfs(processes)
    print_gantt_chart(gantt)
    print_metrics_table(procs)
    return gantt, procs