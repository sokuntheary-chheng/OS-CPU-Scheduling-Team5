# =============================================================================
# rr.py - Round Robin (Preemptive)
# OS CPU Scheduling Simulator - Team 5
# Author: D (d_id)
# =============================================================================
# Algorithm Logic:
#   Each process is given a fixed time slice (quantum).
#   If a process does not finish within its quantum, it is preempted and added
#   to the back of the ready queue.
#   New arrivals during a quantum are added to the queue after the current
#   process's turn (checked at every quantum boundary).
#   A circular queue (deque) manages the ready order.
# =============================================================================

import copy
from collections import deque
from display import print_gantt_chart, print_metrics_table, compute_metrics


def round_robin(processes, quantum=2):
    """
    Round Robin scheduling with configurable time quantum.
    Args:
        processes : list of Process objects
        quantum   : time slice per turn (default 2). Must be >= 1, otherwise
                    a process could be "executed" for 0 time units and the
                    simulation would never advance (infinite loop).
    Returns:
        (gantt, processes_copy)
    """
    if quantum < 1:
        raise ValueError("Round Robin quantum must be a positive integer (>= 1).")

    procs = copy.deepcopy(processes)

    # Sort by arrival time for initial ordering
    procs.sort(key=lambda p: (p.arrival_time, p.pid))

    gantt = []
    current_time = 0
    queue = deque()          # ready queue
    completed = []
    remaining = list(procs)  # processes not yet arrived

    # Seed queue with processes arriving at time 0
    arrived_now = [p for p in remaining if p.arrival_time <= current_time]
    for p in arrived_now:
        queue.append(p)
        remaining.remove(p)

    while queue or remaining:
        if not queue:
            # CPU idle: jump to next process arrival
            current_time = remaining[0].arrival_time
            arrived_now = [p for p in remaining if p.arrival_time <= current_time]
            for p in arrived_now:
                queue.append(p)
                remaining.remove(p)

        process = queue.popleft()

        # Record first execution time (response time)
        if process.start_time == -1:
            process.start_time = current_time

        # Execute for min(quantum, remaining_time)
        exec_time = min(quantum, process.remaining_time)
        start = current_time
        current_time += exec_time
        process.remaining_time -= exec_time

        gantt.append((process.pid, start, current_time))

        # Enqueue processes that arrived during this quantum BEFORE re-adding
        # the process that just ran. This preserves standard RR convention:
        # a process that is preempted goes to the back of the line behind
        # anyone who arrived while it was running.
        newly_arrived = [p for p in remaining if p.arrival_time <= current_time]
        for p in newly_arrived:
            queue.append(p)
            remaining.remove(p)

        if process.remaining_time == 0:
            # Process finished
            process.finish_time = current_time
            completed.append(process)
        else:
            # Process not done; re-add to back of queue (after new arrivals)
            queue.append(process)

    compute_metrics(completed)
    completed.sort(key=lambda p: p.pid)
    return gantt, completed


def run_rr(processes, quantum=2):
    """Entry point: runs Round Robin and prints results."""
    print("\n" + "=" * 60)
    print(f"  ROUND ROBIN (RR) - Quantum = {quantum}")
    print("=" * 60)
    gantt, procs = round_robin(processes, quantum)
    print_gantt_chart(gantt)
    print_metrics_table(procs)
    return gantt, procs