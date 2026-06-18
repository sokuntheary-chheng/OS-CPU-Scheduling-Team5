# =============================================================================
# process.py - Shared Process Data Class
# OS CPU Scheduling Simulator - Team 5
# =============================================================================

class Process:
    """
    Represents a CPU process with all scheduling-related attributes.
    Shared across all scheduling algorithm modules.
    """

    def __init__(self, pid, arrival_time, burst_time, priority=0):
        self.pid = pid                          # Process ID (e.g., "P1")
        self.arrival_time = arrival_time        # Time process arrives in ready queue
        self.burst_time = burst_time            # Total CPU time required
        self.priority = priority                # Priority (used in MLFQ)

        # Tracking fields (set during simulation)
        self.remaining_time = burst_time        # Remaining burst time (for preemptive)
        self.start_time = -1                    # First time process gets CPU
        self.finish_time = -1                   # Time process completes
        self.waiting_time = 0                   # Total time spent waiting
        self.turnaround_time = 0                # finish_time - arrival_time
        self.response_time = -1                 # start_time - arrival_time

    def reset(self):
        """Reset tracking fields so the same process can be reused across algorithms."""
        self.remaining_time = self.burst_time
        self.start_time = -1
        self.finish_time = -1
        self.waiting_time = 0
        self.turnaround_time = 0
        self.response_time = -1

    def __repr__(self):
        return (f"Process({self.pid}, arrival={self.arrival_time}, "
                f"burst={self.burst_time})")


def get_sample_processes():
    """
    Returns the standard sample scenario defined in the project brief.
    P1: Arrival=0, Burst=5
    P2: Arrival=1, Burst=3
    P3: Arrival=2, Burst=8
    P4: Arrival=3, Burst=6
    """
    return [
        Process("P1", arrival_time=0, burst_time=5),
        Process("P2", arrival_time=1, burst_time=3),
        Process("P3", arrival_time=2, burst_time=8),
        Process("P4", arrival_time=3, burst_time=6),
    ]


def _read_int(prompt, min_val=0, allow_zero=True):
    """Read and validate an integer from stdin. Keeps asking until valid."""
    while True:
        raw = input(prompt).strip()
        if not raw:
            print(f"    [!] Input cannot be empty. Please enter a number.")
            continue
        try:
            val = int(raw)
        except ValueError:
            print(f"    [!] '{raw}' is not a valid integer. Try again.")
            continue
        if val < min_val:
            print(f"    [!] Value must be >= {min_val}. Try again.")
            continue
        if not allow_zero and val == 0:
            print(f"    [!] Value must be > 0. Try again.")
            continue
        return val


def input_processes():
    """
    Prompts the user to enter processes manually via the terminal.
    Validates all input before returning a list of Process objects.
    """
    processes = []
    print("\n--- Process Input ---")

    n = _read_int("Enter number of processes (must be >= 1): ", min_val=1)

    used_pids = set()
    for i in range(n):
        # PID validation
        while True:
            pid = input(f"  Process {i+1} ID (e.g. P{i+1}): ").strip()
            if not pid:
                print("    [!] PID cannot be empty.")
            elif pid in used_pids:
                print(f"    [!] PID '{pid}' already used. Choose a unique ID.")
            else:
                used_pids.add(pid)
                break

        arrival = _read_int(f"  Arrival Time for {pid} (>= 0): ", min_val=0)
        burst   = _read_int(f"  Burst Time   for {pid} (>= 1): ", min_val=1)
        processes.append(Process(pid, arrival, burst))

    print(f"\n  [✓] {n} process(es) loaded successfully.")
    return processes