# =============================================================================
# main.py - CPU Scheduling Simulator - Main Entry Point
# OS CPU Scheduling Simulator - Team 5
# =============================================================================
# Run: python main.py
# =============================================================================

from process import get_sample_processes, Process
import fcfs as fcfs_mod
import sjf as sjf_mod
import srt as srt_mod
import rr as rr_mod
import mlfq as mlfq_mod
from display import print_averages

# Web UI: Flask-based server
from flask import Flask, render_template, request, jsonify
import json
import os
import csv


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
║  8. Load processes from CSV file             ║
║  9. Load processes from JSON file            ║
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


def read_positive_quantum(prompt, default):
    """
    Prompts for a time quantum and validates it's a positive integer.
    Falls back to `default` on blank input. Re-prompts on invalid/non-positive
    input instead of silently accepting something that would make the
    scheduler loop forever (quantum <= 0).
    """
    while True:
        raw = input(prompt).strip()
        if raw == "":
            return default
        if not raw.isdigit() or int(raw) < 1:
            print("    -> Quantum must be a positive integer. Try again.")
            continue
        return int(raw)


def pause():
    """
    Waits for the user to press Enter before returning to the menu.
    This is a safety net: even on a short terminal window, results can't
    scroll out of view before being read, since nothing else prints until
    the user presses Enter. The menu itself is reprinted right after this
    returns (see the main loop), so the user always sees it again without
    having to type anything.
    """
    input("\n  Press Enter to continue...")

def load_from_csv(filename):
    processes = []
    with open(filename, newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            processes.append(Process(
                pid=row['pid'],
                arrival_time=int(row['arrival']),
                burst_time=int(row['burst'])
            ))
    return processes

def load_from_json(filename):
    with open(filename) as f:
        data = json.load(f)
    return [Process(
        pid=p['pid'],
        arrival_time=p['arrival'],
        burst_time=p['burst']
    ) for p in data]

def processes_from_payload(data):
    procs = []
    for p in data:
        procs.append(Process(pid=p.get('pid'), arrival_time=int(p.get('arrival')),
                             burst_time=int(p.get('burst'))))
    return procs


def make_app(static_folder='static', template_folder='templates'):
    app = Flask(__name__, static_folder=static_folder, template_folder=template_folder)

    @app.route('/')
    def index():
        return render_template('index.html')

    @app.route('/api/run', methods=['POST'])
    def api_run():
        body = request.get_json()
        algo = body.get('algorithm')
        procs = processes_from_payload(body.get('processes', []))
        rr_q = int(body.get('quantum', 2))
        q0 = int(body.get('q0', 2))
        q1 = int(body.get('q1', 4))

        try:
            if algo == 'FCFS':
                gantt, results = fcfs_mod.fcfs(procs)
            elif algo == 'SJF':
                gantt, results = sjf_mod.sjf(procs)
            elif algo == 'SRT':
                gantt, results = srt_mod.srt(procs)
            elif algo == 'RR':
                gantt, results = rr_mod.round_robin(procs, rr_q)
            elif algo == 'MLFQ':
                gantt, results = mlfq_mod.mlfq(procs, q0, q1)
            else:
                return jsonify({'error': 'Unknown algorithm'}), 400

        except Exception as e:
            return jsonify({'error': str(e)}), 500

        # Serialize processes
        proc_list = []
        for p in results:
            proc_list.append({
                'pid': p.pid,
                'arrival': p.arrival_time,
                'burst': p.burst_time,
                'start': p.start_time,
                'finish': p.finish_time,
                'waiting': p.waiting_time,
                'turnaround': p.turnaround_time,
                'response': p.response_time,
            })

        avgs = print_averages(results)

        return jsonify({'gantt': gantt, 'processes': proc_list, 'averages': avgs})

    @app.route('/api/compare', methods=['POST'])
    def api_compare():
        body = request.get_json()
        procs = processes_from_payload(body.get('processes', []))
        rr_q = int(body.get('quantum', 2))
        q0 = int(body.get('q0', 2))
        q1 = int(body.get('q1', 4))

        try:
            _, fcfs_procs = fcfs_mod.fcfs(procs)
            _, sjf_procs  = sjf_mod.sjf(procs)
            _, srt_procs  = srt_mod.srt(procs)
            _, rr_procs   = rr_mod.round_robin(procs, rr_q)
            _, mlfq_procs = mlfq_mod.mlfq(procs, q0, q1)
        except Exception as e:
            return jsonify({'error': str(e)}), 500

        return jsonify({
            'FCFS': print_averages(fcfs_procs),
            'SJF': print_averages(sjf_procs),
            'SRT': print_averages(srt_procs),
            'RR': print_averages(rr_procs),
            'MLFQ': print_averages(mlfq_procs),
        })

    return app


if __name__ == '__main__':
    # Launch Flask app when running `python main.py`
    app = make_app()
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)