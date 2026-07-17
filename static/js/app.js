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
  let perfChart = null;

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
  const fileInput = document.getElementById('file-input');

  function showError(message) {
    updateStatus('Error: ' + message);
    alert(message);
  }

  function createProcessEntry(pid, arrival, burst) {
    if (!pid || typeof pid !== 'string' || pid.trim() === '') {
      throw new Error('Each process must have a valid PID.');
    }
    if (!Number.isInteger(arrival) || arrival < 0) {
      throw new Error('Arrival time must be a whole number of 0 or greater.');
    }
    if (!Number.isInteger(burst) || burst <= 0) {
      throw new Error('Burst time must be a whole number greater than 0.');
    }

    return {
      pid: pid.trim(),
      id: pid.trim(),
      arrival: arrival,
      burst: burst,
      remaining: burst,
      waiting: 0,
      turnaround: 0
    };
  }

  function addProcessEntry(processData, resetInputs = false) {
    const newProcess = createProcessEntry(processData.pid, processData.arrival, processData.burst);
    processes.push(newProcess);
    nextPid += 1;
    updateProcessTable();

    if (resetInputs) {
      processNameInput.value = 'P' + nextPid;
      arrivalInput.value = 0;
      burstInput.value = 1;
    }
  }

  function addProcessFromFields() {
    const arrival = parseInt(arrivalInput.value, 10);
    const burst = parseInt(burstInput.value, 10);
    const enteredName = processNameInput.value.trim();

    if (arrivalInput.value.trim() === '' || isNaN(arrival) || arrival < 0) {
      showError('Please enter a valid Arrival Time (0 or greater).');
      return false;
    }
    if (burstInput.value.trim() === '' || isNaN(burst) || burst <= 0) {
      showError('Please enter a valid Burst Time (1 or greater).');
      return false;
    }

    // Check for duplicate PID
    if (processes.some(p => p.pid === enteredName)) {
      showError('PID ' + enteredName + ' already exists.');
      return false;
    }

    try {
      addProcessEntry({ pid: enteredName || `P${nextPid}`, arrival, burst }, true);
      return true;
    } catch (error) {
      showError(error.message);
      return false;
    }
  }

  document.getElementById('add-process-btn').addEventListener('click', function() {
    addProcessFromFields();
  });

  document.getElementById('load-file-btn').addEventListener('click', function() {
    fileInput.click();
  });

  function parseCsvProcesses(text) {
    const rows = text
      .split(/\r?\n/)
      .map(row => row.trim())
      .filter(Boolean);

    if (rows.length === 0) {
      throw new Error('The CSV file is empty.');
    }

    const header = rows[0].split(',').map(cell => cell.trim().toLowerCase());
    if (header.length !== 3 || header[0] !== 'pid' || header[1] !== 'arrival' || header[2] !== 'burst') {
      throw new Error('CSV must use the header: pid,arrival,burst');
    }

    return rows.slice(1).map((row, index) => {
      const values = row.split(',').map(cell => cell.trim());
      if (values.length !== 3) {
        throw new Error('Each CSV row must have exactly 3 values: pid, arrival, burst.');
      }

      const [pid, arrivalText, burstText] = values;
      const arrival = Number.parseInt(arrivalText, 10);
      const burst = Number.parseInt(burstText, 10);

      if (!pid) {
        throw new Error(`Row ${index + 2} is missing a PID.`);
      }
      if (Number.isNaN(arrival) || !Number.isInteger(arrival) || arrival < 0) {
        throw new Error(`Row ${index + 2} has an invalid arrival time.`);
      }
      if (Number.isNaN(burst) || !Number.isInteger(burst) || burst <= 0) {
        throw new Error(`Row ${index + 2} has an invalid burst time.`);
      }

      return { pid, arrival, burst };
    });
  }

  function parseJsonProcesses(text) {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      throw new Error('The JSON file is not valid JSON.');
    }

    if (!Array.isArray(parsed)) {
      throw new Error('JSON must be an array of process objects.');
    }

    return parsed.map((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        throw new Error(`Item ${index + 1} must be an object.`);
      }

      const { pid, arrival, burst } = item;
      const arrivalValue = Number.parseInt(arrival, 10);
      const burstValue = Number.parseInt(burst, 10);

      if (!pid || typeof pid !== 'string' || pid.trim() === '') {
        throw new Error(`Item ${index + 1} is missing a valid PID.`);
      }
      if (Number.isNaN(arrivalValue) || !Number.isInteger(arrivalValue) || arrivalValue < 0) {
        throw new Error(`Item ${index + 1} has an invalid arrival time.`);
      }
      if (Number.isNaN(burstValue) || !Number.isInteger(burstValue) || burstValue <= 0) {
        throw new Error(`Item ${index + 1} has an invalid burst time.`);
      }

      return { pid: pid.trim(), arrival: arrivalValue, burst: burstValue };
    });
  }

  fileInput.addEventListener('change', function() {
    const selectedFile = fileInput.files[0];
    if (!selectedFile) {
      return;
    }

    const fileName = selectedFile.name.toLowerCase();
    const extension = fileName.endsWith('.csv') ? 'csv' : fileName.endsWith('.json') ? 'json' : null;

    if (!extension) {
      showError('Please choose a .csv or .json file.');
      fileInput.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = function() {
      try {
        const text = reader.result;
        const parsedProcesses = extension === 'csv' ? parseCsvProcesses(text) : parseJsonProcesses(text);

        parsedProcesses.forEach(processData => {
          try {
            addProcessEntry(processData, false);
          } catch (error) {
            throw new Error(`Invalid process entry: ${error.message}`);
          }
        });

        updateStatus(`Loaded ${parsedProcesses.length} process${parsedProcesses.length === 1 ? '' : 'es'} from ${selectedFile.name}.`);
      } catch (error) {
        showError(error.message);
      } finally {
        fileInput.value = '';
      }
    };

    reader.onerror = function() {
      showError('Could not read the selected file.');
      fileInput.value = '';
    };

    reader.readAsText(selectedFile);
  });

  document.getElementById('resetBtn').addEventListener('click', () => {
    stopSimulation();
    processes.length = 0;
    nextPid = 1;
    processNameInput.value = 'P1';
    currentTime = 0;
    simulationEnd = 0;
    simulationGantt = [];
    simulationProcesses = [];
    simulationAverages = null;
    updateProcessTable();
    clearGantt();
    renderMetrics([], null);
    resetToSingleMetrics();
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

  // Track color assignments for each PID
  const pidColors = {};
  const palette = ['#2563eb', '#16a34a', '#f59e0b', '#8b5cf6', '#0f766e', '#dc2626', '#7c3aed', '#0ea5e9'];
  let nextColorIndex = 0;

  function getProcessColor(pid) {
    if (!pidColors[pid]) {
      pidColors[pid] = palette[nextColorIndex % palette.length];
      nextColorIndex++;
    }
    return pidColors[pid];
  }

  function renderLegend(uniquePids) {
    const area = document.getElementById('gantt');
    const legend = document.createElement('div');
    legend.className = 'gantt-legend d-flex flex-wrap gap-3 mt-3';
    
    uniquePids.forEach(pid => {
      const item = document.createElement('div');
      item.className = 'd-flex align-items-center';
      item.innerHTML = `<span style="width: 12px; height: 12px; background: ${getProcessColor(pid)}; border-radius: 2px; margin-right: 6px;"></span>` +
                       `<span class="small text-muted">${pid}</span>`;
      legend.appendChild(item);
    });
    
    area.appendChild(legend);
  }

  function renderGantt(gantt, uptoTime = null) {
    const area = document.getElementById('gantt');
    area.innerHTML = '';

    if (!gantt || gantt.length === 0) {
      area.textContent = 'No execution.';
      return;
    }

    const visibleSegments = gantt.filter(seg => {
      const [_, start, end] = seg;
      if (uptoTime !== null && start >= uptoTime) {
        return false;
      }
      const visibleEnd = uptoTime === null ? end : Math.min(end, uptoTime);
      return visibleEnd > start;
    });

    if (visibleSegments.length === 0) {
      area.textContent = 'No execution.';
      return;
    }

    const totalEnd = Math.max(...gantt.map(s => s[2]));
    const maxTime = Math.max(totalEnd, uptoTime ?? 0);
    const leftPad = 84;
    const rowHeight = 40;
    const containerWidth = area.offsetWidth;
    // Calculate pixels per time unit to fit in container
    const timeUnitPx = maxTime > 0 ? (containerWidth - leftPad - 24) / maxTime : 52;
    const chartWidth = containerWidth;
    // Display ticks at every time unit for better readability
    const tickStep = 1;

    const shell = document.createElement('div');
    shell.className = 'gantt-shell';
    shell.style.width = chartWidth + 'px';

    const ruler = document.createElement('div');
    ruler.className = 'gantt-ruler';
    ruler.style.width = chartWidth - leftPad + 'px';
    ruler.style.marginLeft = leftPad + 'px';

    for (let t = 0; t <= maxTime; t += tickStep) {
      const tick = document.createElement('div');
      tick.className = 'gantt-tick';
      tick.style.left = (t * timeUnitPx) + 'px';
      
      // Determine if we should show the label based on available space
      const showLabel = (timeUnitPx >= 20 || t % 2 === 0);
      
      tick.innerHTML = '<span class="gantt-tick-mark"></span>' +
                       (showLabel ? '<span class="gantt-tick-label">' + t + '</span>' : '');
      ruler.appendChild(tick);
    }

    shell.appendChild(ruler);

    const rows = document.createElement('div');
    rows.className = 'gantt-rows';

    // Track the end time of the last segment in each row to identify gaps
    const rowLastEndTime = {};

    visibleSegments.forEach(seg => {
      const [pid, start, end] = seg;
      const visibleEnd = uptoTime === null ? end : Math.min(end, uptoTime);
      if (visibleEnd <= start) {
        return;
      }

      const row = document.createElement('div');
      row.className = 'gantt-row';
      row.style.minHeight = rowHeight + 'px';

      const label = document.createElement('div');
      label.className = 'gantt-row-label';
      label.textContent = pid;
      row.appendChild(label);

      const track = document.createElement('div');
      track.className = 'gantt-track';
      track.style.width = (maxTime * timeUnitPx) + 'px';

      // Render Idle segment if there's a gap
      const lastEnd = rowLastEndTime[pid] || 0;
      if (start > lastEnd) {
        const idleBar = document.createElement('div');
        idleBar.className = 'gantt-bar idle';
        idleBar.style.left = (lastEnd * timeUnitPx) + 'px';
        idleBar.style.width = ((start - lastEnd) * timeUnitPx) + 'px';
        idleBar.innerHTML = '<span class="gantt-bar-label">Idle</span>';
        track.appendChild(idleBar);
      }

      const bar = document.createElement('div');
      const color = getProcessColor(pid);
      bar.className = 'gantt-bar';
      bar.style.background = color;
      const barStart = start * timeUnitPx;
      const barWidth = (visibleEnd - start) * timeUnitPx;
      bar.style.left = barStart + 'px';
      bar.style.width = barWidth + 'px';
      const labelText = pid + ' (' + start + '-' + visibleEnd + ')';
      bar.innerHTML = '<span class="gantt-bar-label">' + labelText + '</span>';
      track.appendChild(bar);
      
      row.appendChild(track);
      rows.appendChild(row);

      rowLastEndTime[pid] = visibleEnd;
    });

    shell.appendChild(rows);
    area.appendChild(shell);
    
    // Render legend
    const uniquePids = [...new Set(visibleSegments.map(s => s[0]))].sort();
    renderLegend(uniquePids);
    
    area.style.minHeight = Math.max(220, visibleSegments.length * rowHeight + 130) + 'px';
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

  function resetToSingleMetrics() {
    if (perfChart) {
      perfChart.destroy();
      perfChart = null;
    }
    const stateNode = document.getElementById('metricState');
    if (stateNode) stateNode.textContent = 'Run a simulation to see your metrics.';
    initPerfChart();
  }

  // Initialize performance metrics display
  resetToSingleMetrics();

  document.getElementById('compareBtn').addEventListener('click', fetchAndCompare);

  async function fetchAndCompare() {
    updateStatus('Comparing algorithms...');
    const payloadProcesses = processes.map(p => ({
      pid: p.pid || p.id,
      arrival: p.arrival,
      burst: p.burst
    }));

    const resp = await fetch('/api/compare', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ 
        processes: payloadProcesses,
        quantum: parseInt(document.getElementById('quantum').value) || 2,
        q0: parseInt(document.getElementById('q0').value) || 2,
        q1: parseInt(document.getElementById('q1').value) || 4
      })
    });

    const data = await resp.json();
    if (data.error) {
      alert('Error: ' + data.error);
      updateStatus('Ready');
      return;
    }

    const dataArray = Object.entries(data).map(([label, metrics]) => ({
      label,
      avg_waiting: metrics.avg_waiting,
      avg_turnaround: metrics.avg_turnaround,
      avg_response: metrics.avg_response
    }));

    renderComparisonTable(dataArray);
    renderComparisonChart(dataArray);
    updateStatus('Comparison ready');
  }

  function renderComparisonTable(data) {
    const stateNode = document.getElementById('metricState');
    if (stateNode) {
        stateNode.innerHTML = '<table class="table table-sm small mt-2"><thead><tr><th>Algo</th><th>Wait</th><th>TAT</th><th>Resp</th></tr></thead><tbody>' +
            data.map(d => `<tr><td>${d.label}</td><td>${d.avg_waiting.toFixed(1)}</td><td>${d.avg_turnaround.toFixed(1)}</td><td>${d.avg_response.toFixed(1)}</td></tr>`).join('') +
            '</tbody></table>';
    }
  }

  function renderComparisonChart(data) {
    if (perfChart) {
      perfChart.destroy();
      perfChart = null;
    }
    const canvas = document.getElementById('perfChart');
    if (!canvas || typeof Chart === 'undefined') return;

    perfChart = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: data.map(d => d.label),
        datasets: [
          { label: 'Avg Waiting', data: data.map(d => d.avg_waiting), backgroundColor: '#2563eb' },
          { label: 'Avg Turnaround', data: data.map(d => d.avg_turnaround), backgroundColor: '#f59e0b' },
          { label: 'Avg Response', data: data.map(d => d.avg_response), backgroundColor: '#16a34a' }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { 
            legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } },
            title: { display: true, text: 'Algorithm Performance Comparison' }
        },
        scales: {
          y: { beginAtZero: true, ticks: { color: '#64748b' } },
          x: { ticks: { color: '#64748b' } }
        }
      }
    });
  }

  function initPerfChart() {
    const canvas = document.getElementById('perfChart');
    if (!canvas || typeof Chart === 'undefined') {
      return null;
    }

    if (perfChart) {
      return perfChart;
    }

    perfChart = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: ['Waiting', 'Turnaround', 'CPU'],
        datasets: [{
          label: 'Performance',
          data: [0, 0, 0],
          backgroundColor: ['#60a5fa', '#34d399', '#f59e0b'],
          borderRadius: 10,
          maxBarThickness: 30
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: '#64748b' },
            grid: { color: 'rgba(148, 163, 184, 0.18)' }
          },
          x: {
            ticks: { color: '#64748b' },
            grid: { display: false }
          }
        }
      }
    });

    return perfChart;
  }

  function updatePerfChart(values) {
    const chart = initPerfChart();
    if (!chart) {
      return;
    }

    const safeValues = values || { avg_waiting: 0, avg_turnaround: 0, cpu_utilization: 0 };
    const chartValues = [
      safeValues.avg_waiting || 0,
      safeValues.avg_turnaround || 0,
      safeValues.cpu_utilization || 0
    ];

    chart.data.datasets[0].data = chartValues;
    const maxY = Math.max(10, Math.ceil(Math.max(...chartValues, 5) / 10) * 10);
    chart.options.scales.y.max = maxY;
    chart.update();
  }

  function renderMetrics(processes, averages, uptoTime = null) {
    const avgWaitingNode = document.getElementById('avgWaiting');
    const avgTurnaroundNode = document.getElementById('avgTurnaround');
    const cpuUtilNode = document.getElementById('cpuUtil');
    const metricBadgeNode = document.getElementById('metricBadge');
    const metricStateNode = document.getElementById('metricState');

    const formatMs = value => Number.isFinite(value) ? value.toFixed(2) + ' ms' : '—';
    const formatPercent = value => Number.isFinite(value) ? value + '%' : '—';

    if (!processes || processes.length === 0 || !averages) {
      avgWaitingNode.textContent = '—';
      avgTurnaroundNode.textContent = '—';
      cpuUtilNode.textContent = '—';
      if (metricBadgeNode) {
        metricBadgeNode.textContent = 'Awaiting run';
      }
      if (metricStateNode) {
        metricStateNode.textContent = 'Run a simulation to see your metrics.';
      }
      updatePerfChart(null);
      return;
    }

    let avgWaiting = averages.avg_waiting ?? 0;
    let avgTurnaround = averages.avg_turnaround ?? 0;
    let cpuUtil = null;

    if (uptoTime === null || uptoTime <= 0 || (simulationEnd && uptoTime >= simulationEnd)) {
      avgWaitingNode.textContent = formatMs(avgWaiting);
      avgTurnaroundNode.textContent = formatMs(avgTurnaround);
      const totalBurst = processes.reduce((s, p) => s + (p.burst || 0), 0);
      const totalTime = Math.max(...processes.map(p => p.finish)) || totalBurst || 1;
      cpuUtil = Math.round((totalBurst / totalTime) * 100);
      cpuUtilNode.textContent = formatPercent(cpuUtil);
      if (metricBadgeNode) {
        metricBadgeNode.textContent = uptoTime <= 0 ? 'Initial snapshot' : 'Completed';
      }
      if (metricStateNode) {
        metricStateNode.textContent = ''; // FIXED: Clear metricState for single runs
      }
      updatePerfChart({ avg_waiting: avgWaiting, avg_turnaround: avgTurnaround, cpu_utilization: cpuUtil });
      return;
    }

    const completed = processes.filter(p => p.finish <= uptoTime);
    if (completed.length > 0) {
      avgWaiting = completed.reduce((sum, p) => sum + (p.waiting || 0), 0) / completed.length;
      avgTurnaround = completed.reduce((sum, p) => sum + (p.turnaround || 0), 0) / completed.length;
      avgWaitingNode.textContent = formatMs(avgWaiting);
      avgTurnaroundNode.textContent = formatMs(avgTurnaround);
    } else {
      avgWaitingNode.textContent = '—';
      avgTurnaroundNode.textContent = '—';
    }

    const busyTime = computeBusyTime(simulationGantt, uptoTime);
    cpuUtil = Math.round((busyTime / Math.max(uptoTime, 1)) * 100);
    cpuUtilNode.textContent = formatPercent(cpuUtil);
    if (metricBadgeNode) {
      metricBadgeNode.textContent = 'Live view';
    }
    if (metricStateNode) {
      metricStateNode.textContent = ''; // FIXED: Clear metricState for single runs
    }
    updatePerfChart({ avg_waiting: avgWaiting, avg_turnaround: avgTurnaround, cpu_utilization: cpuUtil });
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

    resetToSingleMetrics();

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