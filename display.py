# =============================================================================
# display.py - Gantt Chart and Metrics Display Utilities
# OS CPU Scheduling Simulator - Team 5
# =============================================================================

def print_gantt_chart(gantt):
    """
    Prints an ASCII Gantt chart from a list of (pid, start, end) tuples.
    Example gantt = [("P1", 0, 5), ("P2", 5, 8), ...]
    """
    if not gantt:
        print("  No Gantt data to display.")
        return

    print("\n  Gantt Chart:")
    print("  " + "-" * (len(gantt) * 6 + 1))

    # Process name row
    row = "  |"
    for (pid, start, end) in gantt:
        label = pid.center(5)
        row += label + "|"
    print(row)

    print("  " + "-" * (len(gantt) * 6 + 1))

    # Time markers row
    time_row = "  "
    for (pid, start, end) in gantt:
        time_row += str(start).ljust(6)
    # Add final end time
    time_row += str(gantt[-1][2])
    print(time_row)
    print()


def print_metrics_table(processes):
    """
    Prints a formatted table of scheduling metrics for each process.
    Columns: PID, Arrival, Burst, Start, Finish, Waiting, Turnaround, Response

    Fix: guards against an empty process list. Previously this divided by
    n = len(processes) unconditionally, which raised ZeroDivisionError
    whenever an algorithm was run with zero processes (e.g. after entering
    "0" at the "Enter number of processes" prompt).
    """
    print("\n  Scheduling Metrics:")
    header = f"  {'PID':<6} {'Arrival':<10} {'Burst':<8} {'Start':<8} {'Finish':<9} {'Waiting':<10} {'Turnaround':<13} {'Response':<10}"
    print(header)
    print("  " + "-" * (len(header) - 2))

    if not processes:
        print("  (no processes to display)")
        print("  " + "-" * (len(header) - 2))
        print()
        return

    total_wt = total_tat = total_rt = 0
    for p in processes:
        wt  = p.waiting_time
        tat = p.turnaround_time
        rt  = p.response_time
        total_wt  += wt
        total_tat += tat
        total_rt  += rt
        print(f"  {p.pid:<6} {p.arrival_time:<10} {p.burst_time:<8} "
              f"{p.start_time:<8} {p.finish_time:<9} {wt:<10} {tat:<13} {rt:<10}")

    n = len(processes)
    print("  " + "-" * (len(header) - 2))
    print(f"  {'Average':<6} {'':<10} {'':<8} {'':<8} {'':<9} "
          f"{total_wt/n:<10.2f} {total_tat/n:<13.2f} {total_rt/n:<10.2f}")
    print()


def compute_metrics(processes):
    """
    Calculates waiting time, turnaround time, and response time for each process.
    Must be called after finish_time and start_time are set by the algorithm.
    """
    for p in processes:
        p.turnaround_time = p.finish_time - p.arrival_time
        p.waiting_time    = p.turnaround_time - p.burst_time
        p.response_time   = p.start_time - p.arrival_time


def print_averages(processes):
    """
    Returns dict of average metrics.

    Fix: guards against an empty process list (was: unconditional division
    by n = len(processes), which crashes when processes == []).
    """
    n = len(processes)
    if n == 0:
        return {"avg_waiting": 0.0, "avg_turnaround": 0.0, "avg_response": 0.0}

    avg_wt  = sum(p.waiting_time    for p in processes) / n
    avg_tat = sum(p.turnaround_time for p in processes) / n
    avg_rt  = sum(p.response_time   for p in processes) / n
    return {"avg_waiting": avg_wt, "avg_turnaround": avg_tat, "avg_response": avg_rt}