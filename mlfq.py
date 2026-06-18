# =============================================================================
# mlfq.py - Multilevel Feedback Queue
# OS CPU Scheduling Simulator - Team 5
# Author: Chheng Sokuntheary
# =============================================================================
# Queue Structure (3 levels):
#   Q0 (Highest Priority) : Round Robin, quantum = 2
#   Q1 (Medium Priority)  : Round Robin, quantum = 4
#   Q2 (Lowest Priority)  : FCFS (runs to completion)
#
# Demotion Logic:
#   A process that uses its full quantum in Q0 is moved down to Q1.
#   A process that uses its full quantum in Q1 is moved down to Q2.
#   A process in Q2 runs FCFS until completion.
#
# Promotion / Aging Logic:
#   Any process waiting in Q1 or Q2 for >= AGING_THRESHOLD ticks
#   is promoted one level up to prevent starvation.
#
# New arrivals always enter Q0.
#
# Design note (no mid-slice preemption):
#   Once a process starts a time slice, it runs uninterrupted for
#   min(quantum, remaining_time), even if a process arrives in a higher
#   queue during that slice. The higher-priority arrival simply waits at
#   the front of its queue and is picked next. This is a deliberate scope
#   decision (documented in the project report) rather than a bug: the
#   3-level RR/RR/FCFS structure with quantum-based demotion and aging is
#   what the project brief specifies, and the sample-scenario tests were
#   validated against this behavior. True mid-slice preemption (interrupting
#   a running Q1/Q2 process the instant a Q0 process arrives) is noted as a
#   possible extension rather than implemented, to avoid changing tested
#   output late in the project.
# =============================================================================

import copy
from collections import deque
from display import print_gantt_chart, print_metrics_table, compute_metrics

# Aging threshold: if a process waits this many ticks without running, promote it
AGING_THRESHOLD = 10


class MLFQProcess:
    """Wraps a Process with MLFQ-specific tracking fields."""
    def __init__(self, process):
        self.proc = process          # underlying Process object
        self.queue_level = 0         # current queue level (0, 1, 2)
        self.wait_since = process.arrival_time  # last time this process was run or arrived


def mlfq(processes, q0=2, q1=4):
    """
    Multilevel Feedback Queue scheduling.
    Args:
        processes : list of Process objects
        q0        : quantum for Q0 (default 2). Must be >= 1.
        q1        : quantum for Q1 (default 4). Must be >= 1.
        Q2        : FCFS (no quantum limit)
    Returns:
        (gantt, processes_copy)

    Bug fixes applied:
      - q0 / q1 <= 0 previously caused exec_time = min(quantum, remaining_time)
        to become 0, so current_time never advanced and the scheduling loop
        ran forever. Both quanta are now validated up front.
      - Empty `processes` list previously fell through to compute_metrics([])
        and then print_averages/print_metrics_table, which divided by
        n = len(processes) = 0. Now returns an empty result immediately.
      - apply_aging() could double-promote a process in a single call: it
        iterates levels [2, 1] in that order, so a process aged out of Q2
        into Q1 could be re-checked against the Q1 promotion condition in
        the very same pass (since the level-1 snapshot was taken from a
        queue that had just received new arrivals from level 2), letting it
        jump Q2 -> Q1 -> Q0 in one tick. Aging now snapshots both queues
        before applying any promotions, so a process can move up by at
        most one level per aging check, matching the "promote one level"
        rule described above.
    """
    if q0 < 1 or q1 < 1:
        raise ValueError("MLFQ quanta (q0, q1) must be positive integers (>= 1).")

    if not processes:
        return [], []

    procs = copy.deepcopy(processes)
    procs.sort(key=lambda p: (p.arrival_time, p.pid))

    # Wrap processes
    mlfq_procs = [MLFQProcess(p) for p in procs]

    # Three ready queues
    queues = [deque(), deque(), deque()]

    gantt = []
    current_time = 0
    completed_procs = []
    not_arrived = list(mlfq_procs)  # processes not yet admitted

    def enqueue_arrivals(time):
        """Move newly arrived processes into Q0."""
        arrived = [mp for mp in not_arrived if mp.proc.arrival_time <= time]
        for mp in arrived:
            mp.wait_since = mp.proc.arrival_time
            queues[0].append(mp)
            not_arrived.remove(mp)

    def apply_aging(time):
        """
        Promote processes that have been waiting too long.
        Q1 -> Q0, Q2 -> Q1 if wait >= AGING_THRESHOLD.

        Fix: snapshot both queues' eligible processes BEFORE moving anything,
        so a process promoted from Q2 into Q1 cannot also be evaluated (and
        promoted again) by the Q1 check in the same call. This guarantees a
        process advances at most one queue level per aging pass.
        """
        eligible_by_level = {}
        for level in (2, 1):
            eligible_by_level[level] = [
                mp for mp in queues[level]
                if (time - mp.wait_since) >= AGING_THRESHOLD
            ]

        for level in (2, 1):
            for mp in eligible_by_level[level]:
                queues[level].remove(mp)
                mp.queue_level = level - 1
                mp.wait_since = time
                queues[level - 1].appendleft(mp)  # add to front for priority

    # Seed initial arrivals
    enqueue_arrivals(current_time)

    while len(completed_procs) < len(procs) or not_arrived:
        # Apply aging check at each scheduling decision
        apply_aging(current_time)

        # Admit any new arrivals
        enqueue_arrivals(current_time)

        # Find highest-priority non-empty queue
        chosen_queue = -1
        for level in range(3):
            if queues[level]:
                chosen_queue = level
                break

        if chosen_queue == -1:
            # All queues empty but processes still waiting to arrive
            if not_arrived:
                current_time = min(mp.proc.arrival_time for mp in not_arrived)
                enqueue_arrivals(current_time)
                continue
            else:
                break  # done

        mp = queues[chosen_queue].popleft()
        p = mp.proc

        # Set quantum based on queue level
        if chosen_queue == 0:
            quantum = q0
        elif chosen_queue == 1:
            quantum = q1
        else:
            quantum = p.remaining_time  # Q2 = FCFS, run to completion

        # Record first execution
        if p.start_time == -1:
            p.start_time = current_time

        # Execute
        exec_time = min(quantum, p.remaining_time)
        start = current_time
        current_time += exec_time
        p.remaining_time -= exec_time

        gantt.append((p.pid, start, current_time))

        # Admit arrivals during this slice
        enqueue_arrivals(current_time)
        apply_aging(current_time)

        if p.remaining_time == 0:
            # Process finished
            p.finish_time = current_time
            completed_procs.append(p)
        else:
            # Demote if process used full quantum (not in Q2)
            if chosen_queue < 2 and exec_time == quantum:
                mp.queue_level = chosen_queue + 1  # demote
            else:
                mp.queue_level = chosen_queue       # stay (was preempted or Q2)

            mp.wait_since = current_time
            queues[mp.queue_level].append(mp)

    compute_metrics(completed_procs)
    completed_procs.sort(key=lambda p: p.pid)
    return gantt, completed_procs


def run_mlfq(processes, q0=2, q1=4):
    """Entry point: runs MLFQ and prints results."""
    print("\n" + "=" * 60)
    print(f"  MULTILEVEL FEEDBACK QUEUE (MLFQ)")
    print(f"  Q0: RR quantum={q0} | Q1: RR quantum={q1} | Q2: FCFS")
    print(f"  Aging Threshold: {AGING_THRESHOLD} ticks")
    print("=" * 60)
    gantt, procs = mlfq(processes, q0, q1)
    print_gantt_chart(gantt)
    print_metrics_table(procs)
    return gantt, procs