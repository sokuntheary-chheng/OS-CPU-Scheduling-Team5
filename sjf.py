# =============================================================================
# sjf.py - Shortest Job First (Non-Preemptive)
# OS CPU Scheduling Simulator - Team 5
# Author: Member B (id_b)
# =============================================================================
# Algorithm Logic:
#   At each scheduling decision point, the process with the shortest burst time
#   among all ARRIVED processes is selected next.
#   Non-preemptive: once a process starts, it runs to completion.
#   Note: SJF can cause starvation for long processes if short ones keep arriving.
# =============================================================================

import copy
from display import print_gantt_chart, print_metrics_table, compute_metrics


def sjf(processes):
    """
    Shortest Job First (non-preemptive) scheduling.
    Args:
        processes: list of Process objects
    Returns:
        (gantt, processes_copy)
    """
    procs = copy.deepcopy(processes)

    gantt = []
    current_time = 0
    completed = []
    remaining = list(procs)

    while remaining:
        # Get all processes that have arrived by current_time
        available = [p for p in remaining if p.arrival_time <= current_time]

        if not available:
            # CPU idle: jump to next arrival
            current_time = min(p.arrival_time for p in remaining)
            continue

        # Pick process with shortest burst time; ties broken by arrival time then PID
        chosen = min(available, key=lambda p: (p.burst_time, p.arrival_time, p.pid))
        remaining.remove(chosen)

        chosen.start_time  = current_time
        chosen.finish_time = current_time + chosen.burst_time
        gantt.append((chosen.pid, chosen.start_time, chosen.finish_time))
        current_time       = chosen.finish_time
        completed.append(chosen)

    compute_metrics(completed)
    # Return in original PID order
    completed.sort(key=lambda p: p.pid)
    return gantt, completed


def run_sjf(processes):
    """Entry point: runs SJF and prints results."""
    print("\n" + "=" * 60)
    print("  SHORTEST JOB FIRST (SJF) - Non-Preemptive")
    print("=" * 60)
    gantt, procs = sjf(processes)
    print_gantt_chart(gantt)
    print_metrics_table(procs)
    return gantt, procs