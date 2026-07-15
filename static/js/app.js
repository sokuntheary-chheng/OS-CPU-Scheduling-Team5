// Minimal frontend glue: manage process list, call backend APIs, render gantt
document.addEventListener('DOMContentLoaded', () => {
  const procs = [];
  const procTable = document.querySelector('#procTable tbody');
  const procTemplate = document.querySelector('#proc-row-template');

  function renderTable() {
    procTable.innerHTML = '';
    procs.forEach(p => {
      const tr = procTemplate.content.cloneNode(true);
      tr.querySelector('.pid').textContent = p.pid;
      tr.querySelector('.arrival').textContent = p.arrival;
      tr.querySelector('.burst').textContent = p.burst;
      tr.querySelector('.remove').addEventListener('click', () => {
        const idx = procs.findIndex(x => x.pid === p.pid);
        if (idx >= 0) { procs.splice(idx,1); renderTable(); }
      });
      procTable.appendChild(tr);
    });
  }

  document.getElementById('addProcBtn').addEventListener('click', () => {
    const pid = prompt('Process ID (e.g. P1):', 'P' + (procs.length+1));
    if (!pid) return;
    const arrival = prompt('Arrival Time (>=0):', '0');
    const burst = prompt('Burst Time (>=1):', '1');
    procs.push({ pid, arrival: parseInt(arrival||0), burst: parseInt(burst||1) });
    renderTable();
  });

  document.getElementById('resetBtn').addEventListener('click', () => { procs.length = 0; renderTable(); clearGantt(); });

  async function runSimulation() {
    const algo = document.getElementById('algorithm').value;
    const quantum = document.getElementById('quantum').value;
    const q0 = document.getElementById('q0').value;
    const q1 = document.getElementById('q1').value;

    const resp = await fetch('/api/run', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ algorithm: algo, processes: procs, quantum, q0, q1 })
    });
    const data = await resp.json();
    if (data.error) { alert('Error: ' + data.error); return; }
    renderGantt(data.gantt);
    renderMetrics(data.processes, data.averages);
  }

  document.getElementById('runBtn').addEventListener('click', runSimulation);

  function clearGantt() { document.getElementById('gantt').innerHTML = ''; }

  function renderGantt(gantt) {
    const area = document.getElementById('gantt'); area.innerHTML = '';
    if (!gantt || gantt.length === 0) { area.textContent = 'No execution.'; return; }

    const totalEnd = Math.max(...gantt.map(s => s[2]));
    const scale = Math.max(400 / Math.max(totalEnd,1), 10); // px per time unit

    let y = 10;
    gantt.forEach(seg => {
      const [pid, start, end] = seg;
      const div = document.createElement('div');
      div.className = 'gantt-bar color-' + pid;
      div.style.left = (start * scale) + 'px';
      div.style.width = ((end - start) * scale) + 'px';
      div.style.top = y + 'px';
      div.textContent = pid + ' (' + start + '-' + end + ')';
      area.appendChild(div);
      y += 36;
    });

    area.style.height = (y + 20) + 'px';
  }

  function renderMetrics(processes, averages) {
    document.getElementById('avgWaiting').textContent = averages.avg_waiting.toFixed(2) + ' ms';
    document.getElementById('avgTurnaround').textContent = averages.avg_turnaround.toFixed(2) + ' ms';
    // CPU utilization: simple estimate
    const totalBurst = processes.reduce((s,p) => s + p.burst, 0);
    const totalTime = Math.max(...processes.map(p => p.finish)) || totalBurst || 1;
    const util = Math.round((totalBurst / totalTime) * 100);
    document.getElementById('cpuUtil').textContent = util + '%';
  }

});
