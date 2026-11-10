const express = require('express');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const SCRIPT = path.join(__dirname, 'stats.sh');

function stats() {
  const out = execSync(`su -c "sh ${SCRIPT}"`).toString();
  const s = { freqs: [] };
  for (const line of out.trim().split('\n')) {
    const i = line.indexOf('=');
    const k = line.slice(0, i), v = line.slice(i + 1).trim();
    if (k === 'freq') s.freqs.push(Math.round(v / 1000));
    else s[k] = v;
  }
  s.temp = s.temp / 10;
  s.govs = s.govs.split(/\s+/);
  const mem = fs.readFileSync('/proc/meminfo', 'utf8');
  const get = n => parseInt(mem.match(new RegExp(n + ':\\s+(\\d+)'))[1]);
  s.ramTotal = Math.round(get('MemTotal') / 1024);
  s.ramFree = Math.round(get('MemAvailable') / 1024);
  return s;
}

app.get('/api/stats', (req, res) => {
  try { res.json(stats()); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/gov/:g', (req, res) => {
  const g = req.params.g;
  if (!stats().govs.includes(g)) return res.status(400).json({ error: 'governor inválido' });
  execSync(`su -c 'for c in /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor; do echo ${g} > $c 2>/dev/null; done; true'`);
  res.json({ ok: true, gov: g });
});

app.use(express.static(path.join(__dirname, 'public')));
app.listen(3000, '0.0.0.0', err => console.log(err ? 'Error: ' + err.message : 'Panel en http://localhost:3000'));

// ---- Procesos ----
const PROTECTED = ['init', 'system_server', 'zygote', 'zygote64', 'surfaceflinger',
  'servicemanager', 'lmkd', 'magiskd', 'com.android.systemui', 'com.termux', 'node', 'bash'];

function procs() {
  const lines = execSync('su -c "ps -A -o PID,USER,RSS,PCPU,NAME"').toString().trim().split('\n').slice(1);
  return lines.map(l => {
    const p = l.trim().split(/\s+/);
    return { pid: +p[0], user: p[1], ram: Math.round(p[2] / 1024), cpu: parseFloat(p[3]), name: p.slice(4).join(' ') };
  }).filter(p => p.ram > 0);
}

app.get('/api/procs', (req, res) => {
  const by = req.query.sort === 'cpu' ? 'cpu' : 'ram';
  try {
    const list = procs().sort((a, b) => b[by] - a[by]).slice(0, 15)
      .map(p => ({ ...p, protected: PROTECTED.includes(p.name) }));
    res.json(list);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/kill/:pid', (req, res) => {
  const pid = parseInt(req.params.pid);
  if (!Number.isInteger(pid) || pid < 2) return res.status(400).json({ error: 'PID inválido' });
  const p = procs().find(x => x.pid === pid);
  if (!p) return res.status(404).json({ error: 'proceso no encontrado' });
  if (PROTECTED.includes(p.name)) return res.status(403).json({ error: 'proceso protegido' });
  execSync(`su -c "kill -9 ${pid}"`);
  res.json({ ok: true, name: p.name });
});
