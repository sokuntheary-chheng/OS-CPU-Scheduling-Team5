// Minimal frontend glue: manage process list, call backend APIs, render gantt
document.addEventListener('DOMContentLoaded', () => {
  let processes = [];
  const procTable = document.querySelector('#procTable tbody');
  const procTemplate = document.querySelector('#proc-row-template');
  let nextPid = 1;

  let isPlaying = false;
  let simInterval = null;
  let currentTime = 0;
  let simulationEnd = 0;
  let simulationGantt = [];
  let simulationProcesses = [];
  let simulationAverages = null;

  function reindexProcessIds() {
    processes.forEach((proc, index) => {
      const nextPidValue = 'P' + (index + 1);
      proc.pid = nextPidValue;
      proc.id = nextPidValue;
    });
    nextPid = processes.length + 1;
  }

  function updateProcessTable() {
    procTable.innerHTML = '';

    if (processes.length === 0) {
      const emptyRow = document.createElement('tr');
      emptyRow.innerHTML = '<td colspan="4" class="text-center text-muted py-3">No processes added yet.</td>';
      procTable.appendChild(emptyRow);
      return;
    }

    processes.forEach(p => {
      const tr = procTemplate.content.cloneNode(true);
      tr.querySelector('.pid').textContent = p.pid;
      tr.querySelector('.arrival').textContent = p.arrival;
      tr.querySelector('.burst').textContent = p.burst;
      tr.querySelector('.remove').addEventListener('click', () => {
        const idx = processes.indexOf(p);
        if (idx >= 0) {
          stopSimulation();
          processes.splice(idx, 1);
          reindexProcessIds();
          simulationGantt = [];
          simulationProcesses = [];
          simulationAverages = null;
          simulationEnd = 0;
          currentTime = 0;
          updateStatus('Ready');
          updateProcessTable();
        }
      });
      procTable.appendChild(tr);
    });
  }

  const processNameInput = document.getElementById('process-name');
  const arrivalInput = document.getElementById('arrival-time');
  const burstInput = document.getElementById('burst-time');

  document.getElementById('add-process-btn').addEventListener('click', function() {
    const arrival = parseInt(arrivalInput.value, 10);
    const burst = parseInt(burstInput.value, 10);
    const enteredName = processNameInput.value.trim();

    if (arrivalInput.value.trim() === '' || isNaN(arrival) || arrival < 0) {
      alert('Please enter a valid Arrival Time (0 or greater).');
      return;
    }
    if (burstInput.value.trim() === '' || isNaN(burst) || burst <= 0) {
      alert('Please enter a valid Burst Time (1 or greater).');
      return;
    }

    const pid = enteredName || `P${nextPid}`;
    const newProcess = {
      pid: pid,
      id: pid,
      arrival: arrival,
      burst: burst,
      remaining: burst,
      waiting: 0,
      turnaround: 0
    };

    processes.push(newProcess);
    nextPid += 1;
    updateProcessTable();

    processNameInput.value = '';
    arrivalInput.value = 0;
    burstInput.value = 1;
  });

  document.getElementById('resetBtn').addEventListener('click', () => {
    stopSimulation();
    processes.length = 0;
    nextPid = 1;
    currentTime = 0;
    simulationEnd = 0;
    simulationGantt = [];
    simulationProcesses = [];
    simulationAverages = null;
    updateProcessTable();
    clearGantt();
    renderMetrics([], null);
    updateStatus('Ready');
  });

  function updateStatus(message) {
    const status = document.getElementById('simStatus');
    if (status) {
      status.textContent = message;
    }
  }

  function stopSimulation() {
    if (simInterval !== null) {
      clearInterval(simInterval);
      simInterval = null;
    }

    isPlaying = false;
    document.getElementById('runBtn').disabled = false;
    document.getElementById('pauseBtn').disabled = true;
  }

  function setPlaying(active) {
    isPlaying = active;
    document.getElementById('runBtn').disabled = active;
    document.getElementById('pauseBtn').disabled = !active;
  }

  function clearGantt() {
    document.getElementById('gantt').innerHTML = '';
  }

  function renderGantt(gantt, uptoTime = null) {
    const area = document.getElementById('gantt');
    area.innerHTML = '';

    if (!gantt || gantt.length === 0) {
      area.textContent = 'No execution.';
      return;
    }

    const totalEnd = Math.max(...gantt.map(s => s[2]));
    const scale = Math.max(400 / Math.max(totalEnd, 1), 10);
    let y = 10;

    gantt.forEach(seg => {
      const [pid, start, end] = seg;
      if (uptoTime !== null && start >= uptoTime) {
        return;
      }

      const visibleStart = start;
      const visibleEnd = uptoTime === null ? end : Math.min(end, uptoTime);
      if (visibleEnd <= visibleStart) {
        return;
      }

      const div = document.createElement('div');
      div.className = 'gantt-bar color-' + pid;
      div.style.left = (visibleStart * scale) + 'px';
      div.style.width = ((visibleEnd - visibleStart) * scale) + 'px';
      div.style.top = y + 'px';
      div.textContent = pid + ' (' + visibleStart + '-' + visibleEnd + ')';
      area.appendChild(div);
      y += 36;
    });

    area.style.height = (y + 20) + 'px';
  }

  function computeBusyTime(gantt, uptoTime) {
    if (!gantt || gantt.length === 0) {
      return 0;
    }
    return gantt.reduce((sum, seg) => {
      const [_, start, end] = seg;
      if (start >= uptoTime) {
        return sum;
      }
      return sum + Math.max(0, Math.min(end, uptoTime) - start);
    }, 0);
  }

  function renderMetrics(processes, averages, uptoTime = null) {
    const avgWaitingNode = document.getElementById('avgWaiting');
    const avgTurnaroundNode = document.getElementById('avgTurnaround');
    const cpuUtilNode = document.getElementById('cpuUtil');

    if (!processes || processes.length === 0) {
      avgWaitingNode.textContent = '-';
      avgTurnaroundNode.textContent = '-';
      cpuUtilNode.textContent = '-';
      return;
    }

    if (uptoTime === null || (simulationEnd && uptoTime >= simulationEnd)) {
      avgWaitingNode.textContent = averages ? averages.avg_waiting.toFixed(2) + ' ms' : '-';
      avgTurnaroundNode.textContent = averages ? averages.avg_turnaround.toFixed(2) + ' ms' : '-';
      const totalBurst = processes.reduce((s, p) => s + p.burst, 0);
      const totalTime = Math.max(...processes.map(p => p.finish)) || totalBurst || 1;
      const util = Math.round((totalBurst / totalTime) * 100);
      cpuUtilNode.textContent = util + '%';
      return;
    }

    const completed = processes.filter(p => p.finish <= uptoTime);
    if (completed.length > 0) {
      const avgWaiting = completed.reduce((sum, p) => sum + p.waiting, 0) / completed.length;
      const avgTurnaround = completed.reduce((sum, p) => sum + p.turnaround, 0) / completed.length;
      avgWaitingNode.textContent = avgWaiting.toFixed(2) + ' ms';
      avgTurnaroundNode.textContent = avgTurnaround.toFixed(2) + ' ms';
    } else {
      avgWaitingNode.textContent = '-';
      avgTurnaroundNode.textContent = '-';
    }

    const busyTime = computeBusyTime(simulationGantt, uptoTime);
    const util = Math.round((busyTime / Math.max(uptoTime, 1)) * 100);
    cpuUtilNode.textContent = util + '%';
  }

  async function fetchSimulationData() {
    const algo = document.getElementById('algorithm').value;
    const quantum = document.getElementById('quantum').value;
    const q0 = document.getElementById('q0').value;
    const q1 = document.getElementById('q1').value;

    const payloadProcesses = processes.map(p => ({
      pid: p.pid || p.id,
      arrival: p.arrival,
      burst: p.burst
    }));

    const resp = await fetch('/api/run', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ algorithm: algo, processes: payloadProcesses, quantum, q0, q1 })
    });

    const data = await resp.json();
    if (data.error) {
      alert('Error: ' + data.error);
      return null;
    }

    return data;
  }

  async function startSimulation() {
    if (isPlaying) {
      return;
    }

    if (processes.length === 0) {
      alert('Add at least one process before running the simulation.');
      return;
    }

    processes.sort((a, b) => a.arrival - b.arrival || (a.pid || a.id).localeCompare(b.pid || b.id));
    updateProcessTable();

    if (simulationGantt.length === 0 || currentTime >= simulationEnd) {
      updateStatus('Loading simulation...');
      const data = await fetchSimulationData();
      if (!data) {
        updateStatus('Ready');
        return;
      }
      simulationGantt = data.gantt;
      simulationProcesses = data.processes;
      simulationAverages = data.averages;
      simulationEnd = simulationGantt.length ? Math.max(...simulationGantt.map(entry => entry[2])) : 0;
      currentTime = 0;
      clearGantt();
      renderMetrics(simulationProcesses, simulationAverages, 0);
    }

    setPlaying(true);
    updateStatus('Running...');
    simInterval = setInterval(() => {
      currentTime += 1;
      renderGantt(simulationGantt, currentTime);
      renderMetrics(simulationProcesses, simulationAverages, currentTime);
      updateStatus('Simulation time: ' + currentTime);

      if (currentTime >= simulationEnd) {
        stopSimulation();
        renderGantt(simulationGantt, simulationEnd);
        renderMetrics(simulationProcesses, simulationAverages, simulationEnd);
        updateStatus('Completed at t=' + simulationEnd);
      }
    }, 600);
  }

  function pauseSimulation() {
    if (!isPlaying) {
      return;
    }
    stopSimulation();
    updateStatus('Paused at t=' + currentTime);
  }

  document.getElementById('runBtn').addEventListener('click', startSimulation);
  document.getElementById('pauseBtn').addEventListener('click', pauseSimulation);

  const algoSelect = document.getElementById('algorithm');
  const quantumGroup = document.getElementById('quantum-group');
  const q0Group = document.getElementById('q0-group');
  const q1Group = document.getElementById('q1-group');

  function updateQuantumVisibility() {
    const algo = algoSelect.value;
    quantumGroup.style.display = 'none';
    q0Group.style.display = 'none';
    q1Group.style.display = 'none';

    if (algo === 'RR') {
      quantumGroup.style.display = 'block';
    } else if (algo === 'MLFQ') {
      q0Group.style.display = 'block';
      q1Group.style.display = 'block';
    }
  }

  algoSelect.addEventListener('change', () => {
    stopSimulation();
    simulationGantt = [];
    simulationProcesses = [];
    simulationAverages = null;
    simulationEnd = 0;
    currentTime = 0;
    updateStatus('Ready');
    updateQuantumVisibility();
  });
  updateQuantumVisibility();
  updateStatus('Ready');
});