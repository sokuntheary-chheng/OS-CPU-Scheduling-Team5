# =============================================================================
# main.py - CPU Scheduling Simulator - Main Entry Point
# OS CPU Scheduling Simulator - Team 5
# =============================================================================
# Run: python main.py
# =============================================================================

from process import get_sample_processes, input_processes
from fcfs  import run_fcfs
from sjf   import run_sjf
from srt   import run_srt
from rr    import run_rr
from mlfq  import run_mlfq
from display import print_averages


MENU = """
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
║  0. Exit                                     ║
╚══════════════════════════════════════════════╝
"""


def print_comparison(results):
    """
    Prints a side-by-side comparison table of average metrics across all algorithms.
    results: dict of { algo_name: processes_list }
    """
    print("\n" + "=" * 70)
    print("  COMPARATIVE ANALYSIS - Average Metrics")
    print("=" * 70)
    print(f"  {'Algorithm':<30} {'Avg Waiting':<15} {'Avg Turnaround':<18} {'Avg Response':<15}")
    print("  " + "-" * 68)
    for name, procs in results.items():
        avgs = print_averages(procs)
        print(f"  {name:<30} {avgs['avg_waiting']:<15.2f} "
              f"{avgs['avg_turnaround']:<18.2f} {avgs['avg_response']:<15.2f}")
    print("=" * 70)
    print()


def main():
    # Default: use sample scenario from project brief
    processes = get_sample_processes()
    rr_quantum   = 2
    mlfq_q0, mlfq_q1 = 2, 4

    print(MENU)
    print(f"  [Default Input] P1(0,5), P2(1,3), P3(2,8), P4(3,6) | RR Quantum={rr_quantum}")

    while True:
        print(MENU)
        choice = input("  Select option: ").strip()

        if choice == "1":
            run_fcfs(processes)

        elif choice == "2":
            run_sjf(processes)

        elif choice == "3":
            run_srt(processes)

        elif choice == "4":
            q = input(f"  Enter time quantum [default {rr_quantum}]: ").strip()
            rr_quantum = int(q) if q.isdigit() else rr_quantum
            run_rr(processes, rr_quantum)

        elif choice == "5":
            run_mlfq(processes, mlfq_q0, mlfq_q1)

        elif choice == "6":
            print("\n  Running all algorithms on current process set...\n")
            _, fcfs_procs  = run_fcfs(processes)
            _, sjf_procs   = run_sjf(processes)
            _, srt_procs   = run_srt(processes)
            _, rr_procs    = run_rr(processes, rr_quantum)
            _, mlfq_procs  = run_mlfq(processes, mlfq_q0, mlfq_q1)

            print_comparison({
                "FCFS"                      : fcfs_procs,
                "SJF (Non-Preemptive)"      : sjf_procs,
                "SRT (Preemptive)"          : srt_procs,
                f"Round Robin (q={rr_quantum})"     : rr_procs,
                f"MLFQ (q0={mlfq_q0},q1={mlfq_q1})": mlfq_procs,
            })

        elif choice == "7":
            processes = input_processes()
            print(f"\n  Loaded {len(processes)} process(es).")

        elif choice == "0":
            print("\n  Exiting simulator. Goodbye!\n")
            break

        else:
            print("  Invalid option. Please try again.")


if __name__ == "__main__":
    main()