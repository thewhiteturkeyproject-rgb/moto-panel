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
app.listen(3000, '0.0.0.0', () => console.log('Panel en http://localhost:3000'));
