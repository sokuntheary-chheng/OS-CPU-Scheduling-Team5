import csv
import json
from process import get_sample_processes, input_processes, Process
from fcfs import run_fcfs
from sjf import run_sjf
from srt import run_srt
from rr import run_rr
from mlfq import run_mlfq
from display import print_averages

# Default simulation parameters
DEFAULT_RR_QUANTUM = 2
DEFAULT_MLFQ_Q0 = 2
DEFAULT_MLFQ_Q1 = 4

def print_menu():
    print("""
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
║  8. Load processes from CSV file             ║
║  9. Load processes from JSON file            ║
║  0. Exit                                     ║
╚══════════════════════════════════════════════╝
""")

def run_all(processes):
    print("\n--- Running All Algorithms (Comparison) ---")
    
    # We need to pass deep copies to avoid reusing modified process data
    import copy
    
    # Run algorithms
    _, procs_fcfs = run_fcfs(copy.deepcopy(processes))
    _, procs_sjf = run_sjf(copy.deepcopy(processes))
    _, procs_srt = run_srt(copy.deepcopy(processes))
    _, procs_rr = run_rr(copy.deepcopy(processes), DEFAULT_RR_QUANTUM)
    _, procs_mlfq = run_mlfq(copy.deepcopy(processes), DEFAULT_MLFQ_Q0, DEFAULT_MLFQ_Q1)
    
    # Get averages
    avg_fcfs = print_averages(procs_fcfs)
    avg_sjf = print_averages(procs_sjf)
    avg_srt = print_averages(procs_srt)
    avg_rr = print_averages(procs_rr)
    avg_mlfq = print_averages(procs_mlfq)
    
    # Print comparison table
    print("\n" + "="*65)
    print(f"{'Algorithm':<15} | {'Avg Waiting':<12} | {'Avg Turnaround':<15} | {'Avg Response':<12}")
    print("-" * 65)
    def print_row(name, avg):
        print(f"{name:<15} | {avg['avg_waiting']:<12.2f} | {avg['avg_turnaround']:<15.2f} | {avg['avg_response']:<12.2f}")
        
    print_row("FCFS", avg_fcfs)
    print_row("SJF", avg_sjf)
    print_row("SRT", avg_srt)
    print_row("RR", avg_rr)
    print_row("MLFQ", avg_mlfq)
    print("="*65)

def load_csv(filename):
    processes = []
    try:
        with open(filename, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                processes.append(Process(
                    pid=row['pid'],
                    arrival_time=int(row['arrival']),
                    burst_time=int(row['burst'])
                ))
        print(f"Successfully loaded {len(processes)} processes from {filename}.")
        return processes
    except Exception as e:
        print(f"Error loading CSV: {e}")
        return None

def load_json(filename):
    processes = []
    try:
        with open(filename, 'r') as f:
            data = json.load(f)
            for item in data:
                processes.append(Process(
                    pid=item['pid'],
                    arrival_time=int(item['arrival']),
                    burst_time=int(item['burst'])
                ))
        print(f"Successfully loaded {len(processes)} processes from {filename}.")
        return processes
    except Exception as e:
        print(f"Error loading JSON: {e}")
        return None

def main():
    processes = get_sample_processes()
    
    while True:
        print_menu()
        choice = input("Enter choice (0-9): ").strip()
        
        if choice == '0':
            print("Exiting...")
            break
        
        elif choice == '1':
            run_fcfs(processes)
        elif choice == '2':
            run_sjf(processes)
        elif choice == '3':
            run_srt(processes)
        elif choice == '4':
            run_rr(processes, DEFAULT_RR_QUANTUM)
        elif choice == '5':
            run_mlfq(processes, DEFAULT_MLFQ_Q0, DEFAULT_MLFQ_Q1)
        elif choice == '6':
            run_all(processes)
        elif choice == '7':
            processes = input_processes()
        elif choice == '8':
            filename = input("Enter CSV filename (e.g., processes.csv): ").strip()
            loaded = load_csv(filename)
            if loaded:
                processes = loaded
        elif choice == '9':
            filename = input("Enter JSON filename (e.g., processes.json): ").strip()
            loaded = load_json(filename)
            if loaded:
                processes = loaded
        else:
            print("Invalid choice, please try again.")
            continue
            
        if choice != '7': # Don't pause after changing input manually
            input("\nPress Enter to continue...")

if __name__ == "__main__":
    main()
