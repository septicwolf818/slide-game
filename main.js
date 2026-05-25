// ─── constants ───
let ROWS = 10, COLS = 10;
const ALL_TYPES = ['p','o','b','r','g','y'];
const ALL_NAMES = { p:'pink', o:'orange', b:'blue', r:'red', g:'green', y:'yellow' };
const ALL_COLORS = { p:'#ff6b9d', o:'#ff9a56', b:'#6cb4ee', r:'#ff4757', g:'#6bcb77', y:'#ffd93d' };
const MS_PER_ROW = 100;
const GAP = 2;
const LEVELS = [
    { target:3000,  moves:25, types:5 },
    { target:6000,  moves:24, types:5 },
    { target:10000, moves:22, types:5 },
    { target:15000, moves:22, types:6 },
    { target:12000, moves:25, types:5, cols:8,  rows:8  },
    { target:18000, moves:22, types:6, cols:8,  rows:8  },
    { target:30000, moves:18, types:6, cols:8,  rows:10 },
    { target:35000, moves:18, types:6, cols:10, rows:8  },
    { target:40000, moves:16, types:6, cols:12, rows:8  },
    { target:50000, moves:16, types:6, cols:12, rows:8  },
];

// ─── state ───
let grid = [];
let score = 0, movesLeft = 0, level = 0;
let selectedCell = null, isProcessing = false, comboCount = 0, sweetStreak = 0;
let levelProgress = [];

// ─── DOM refs ───
let elGrid, elScore, elTarget, elMoves, elLevel, elProgressFill;
let elHome, elGame, elLevelGrid, elOverlay, elModalTitle, elModalScore, elModalBtn, elModalHome, elBtnBack;
let elStarLg, elCombo, elLoading;

function byId(id) { return document.getElementById(id); }

function initDOM() {
    elGrid = byId('grid');
    elScore = byId('score');
    elTarget = byId('score-target');
    elMoves = byId('moves');
    elLevel = byId('lvl-num');
    elProgressFill = byId('progress-fill');
    elHome = byId('home');
    elGame = byId('game');
    elLevelGrid = byId('level-grid');
    elOverlay = byId('overlay');
    elModalTitle = byId('modal-title');
    elModalScore = byId('modal-score');
    elModalBtn = byId('modal-btn');
    elModalHome = byId('modal-home');
    elBtnBack = byId('btn-back');
    elStarLg = document.querySelectorAll('#modal-stars .star-lg');

    elCombo = document.createElement('div');
    elCombo.id = 'combo';
    document.body.appendChild(elCombo);

    elLoading = byId('loading');
}

// ─── helpers ───

function getLevel() {
    const lv = LEVELS[level];
    return { rows:10, cols:10, ...lv };
}

function randomType(balanced = false) {
    const lv = getLevel();
    const types = ALL_TYPES.slice(0, lv.types);
    if (!balanced) return types[Math.floor(Math.random() * types.length)];

    const counts = {};
    for (const t of types) counts[t] = 0;
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const t = grid[r][c];
            if (t !== 'e' && t in counts) counts[t]++;
        }
    }

    const weights = types.map(t => ({ t, w: 1 / (counts[t] + 1) }));
    const total = weights.reduce((s, w) => s + w.w, 0);
    let r = Math.random() * total;
    for (const { t, w } of weights) {
        r -= w;
        if (r <= 0) return t;
    }
    return weights[weights.length - 1].t;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function getCellEl(r, c) {
    return elGrid.querySelector(`[data-r="${r}"][data-c="${c}"]`);
}

function getCellStep() {
    const first = elGrid.querySelector('.cell');
    return first ? first.getBoundingClientRect().width + GAP : 42;
}

// ─── grid ───

function wouldMatch(r, c, type) {
    let count = 1;
    for (let i = c - 1; i >= 0 && grid[r][i] === type; i--) count++;
    for (let i = c + 1; i < COLS && grid[r][i] === type; i++) count++;
    if (count >= 3) return true;
    count = 1;
    for (let i = r - 1; i >= 0 && grid[i][c] === type; i--) count++;
    for (let i = r + 1; i < ROWS && grid[i][c] === type; i++) count++;
    return count >= 3;
}

function initGrid() {
    let safety = 0;
    do {
        grid = Array.from({ length: ROWS }, () => Array(COLS).fill('e'));
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                let type;
                let tries = 0;
                do { type = randomType(); tries++; }
                while (wouldMatch(r, c, type) && tries < 20);
                grid[r][c] = type;
            }
        }
        safety++;
    } while (!findHint() && safety < 10);
}

function renderGrid() {
    elGrid.innerHTML = '';
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.r = r;
            cell.dataset.c = c;
            const type = grid[r][c];
            if (type !== 'e') {
                cell.style.backgroundImage = `url(assets/${ALL_NAMES[type]}.png)`;
            }
            elGrid.appendChild(cell);
        }
    }
}

// ─── matching ───

function findMatchGroups() {
    const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    const groups = [];
    const dirs = [[0,1],[1,0],[0,-1],[-1,0]];
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const type = grid[r][c];
            if (type === 'e' || visited[r][c]) continue;
            const queue = [[r, c]];
            visited[r][c] = true;
            const group = [];
            while (queue.length) {
                const [cr, cc] = queue.shift();
                group.push([cr, cc]);
                for (const [dr, dc] of dirs) {
                    const nr = cr + dr, nc = cc + dc;
                    if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !visited[nr][nc] && grid[nr][nc] === type) {
                        visited[nr][nc] = true;
                        queue.push([nr, nc]);
                    }
                }
            }
            if (group.length >= 3) groups.push(group);
        }
    }
    return groups;
}

function classifyMatch(group) {
    if (group.length < 4) return { type: 'normal', multiplier: 1, name: '' };
    const rows = group.map(([r]) => r);
    const cols = group.map(([_, c]) => c);
    const h = Math.max(...rows) - Math.min(...rows) + 1;
    const w = Math.max(...cols) - Math.min(...cols) + 1;
    const sameRow = rows.every(r => r === rows[0]);
    const sameCol = cols.every(c => c === cols[0]);

    if (sameRow || sameCol) {
        if (group.length >= 5) return { type: 'five', multiplier: 4, name: 'Sweet Streak!' };
        if (group.length === 4) return { type: 'four', multiplier: 2, name: 'Candy Row!' };
    }
    if (h === 2 && w === 2 && group.length === 4) {
        return { type: 'square', multiplier: 3, name: 'Jelly Box!' };
    }
    if (group.length >= 4) {
        if (isPlusShape(group)) return { type: 'plus', multiplier: 6, name: 'Rainbow Blast!' };
        return { type: 'L/T', multiplier: 5, name: 'Sweet!' };
    }
    return { type: 'normal', multiplier: 1, name: '' };
}

function isPlusShape(group) {
    if (group.length < 5) return false;
    const set = new Set(group.map(([r,c]) => `${r},${c}`));
    const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
    for (const [r, c] of group) {
        let n = 0;
        for (const [dr, dc] of dirs) if (set.has(`${r+dr},${c+dc}`)) n++;
        if (n === 4) return true;
    }
    return false;
}
// ─── particles & FX ───

function spawnParticles(x, y, colors, count = 12, isSpecial = false) {
    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'particle' + (isSpecial ? ' star-burst' : '');
        const color = colors[Math.floor(Math.random() * colors.length)];
        const size = isSpecial ? 6 + Math.random() * 10 : 4 + Math.random() * 5;
        p.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px;background:${color};`;
        document.body.appendChild(p);
        const angle = Math.random() * Math.PI * 2;
        const dist = 30 + Math.random() * (isSpecial ? 100 : 50);
        const tx = Math.cos(angle) * dist;
        const ty = Math.sin(angle) * dist - 15 + Math.random() * 20;
        p.animate([
            { transform: 'translate(0,0) scale(1)', opacity: 1 },
            { transform: `translate(${tx}px,${ty}px) scale(0.2)`, opacity: 0 }
        ], { duration: isSpecial ? 700 : 450, easing: 'ease-out' }).onfinish = () => p.remove();
    }
}

function showScorePopup(x, y, text, isBig = false) {
    const el = document.createElement('div');
    el.className = 'score-popup' + (isBig ? ' big' : '');
    el.textContent = text;
    el.style.cssText = `left:${x}px;top:${y}px;`;
    document.body.appendChild(el);
    el.animate([
        { transform: 'translateY(0) scale(0.6)', opacity: 1 },
        { transform: 'translateY(-70px) scale(1)', opacity: 0 }
    ], { duration: 900, easing: 'ease-out' }).onfinish = () => el.remove();
}

function showCombo(count) {
    if (count < 2) return;
    elCombo.textContent = `Combo x${count}`;
    elCombo.className = count >= 4 ? 'big' : '';
    void elCombo.offsetWidth;
    elCombo.classList.add('show');
    if (count >= 3) {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight * 0.4;
        spawnParticles(cx, cy, ['#ffd93d','#ff6b9d','#b388ff','#6bcb77','#fff'],
            Math.min(40, 8 + count * 6), true);
    }
}

function showAnnouncement(text) {
    const el = document.createElement('div');
    el.className = 'announcement';
    el.textContent = text;
    document.body.appendChild(el);
    el.animate([
        { transform: 'translate(-50%,-50%) scale(0)', opacity: 0 },
        { transform: 'translate(-50%,-50%) scale(1.25)', opacity: 1, offset: 0.25 },
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: 0.55 },
        { transform: 'translate(-50%,-50%) scale(0.85)', opacity: 0 }
    ], { duration: 1100, easing: 'ease-out' }).onfinish = () => el.remove();
}

function screenShake(intensity = 1) {
    elGame.style.animation = 'none';
    void elGame.offsetWidth;
    elGame.style.animation = `shake ${0.25 + 0.05 * intensity}s ease`;
}

// ─── gravity ───

const STAGGER_MS = 60;

async function applyGravity() {
    const movements = [];
    for (let c = 0; c < COLS; c++) {
        const stack = [];
        for (let r = ROWS - 1; r >= 0; r--) {
            if (grid[r][c] !== 'e') stack.push({ type: grid[r][c], oldRow: r });
        }
        const n = stack.length;
        const emptySpots = ROWS - n;
        let colIdx = 0;
        let si = 0;
        for (let r = ROWS - 1; r >= 0; r--) {
            if (si < n) {
                const cell = stack[si++];
                grid[r][c] = cell.type;
                const dist = r - cell.oldRow;
                if (dist > 0) movements.push({ r, c, distance: dist, delay: colIdx++ * STAGGER_MS });
            } else {
                grid[r][c] = randomType(true);
                movements.push({ r, c, distance: emptySpots, delay: colIdx++ * STAGGER_MS, isNew: true });
            }
        }
    }
    renderGrid();
    if (movements.length === 0) return;
    elGrid.style.visibility = 'hidden';
    const step = getCellStep();
    const maxDist = Math.max(...movements.map(m => m.distance));
    const maxDelay = Math.max(...movements.map(m => m.delay));
    const totalTime = Math.max(400, maxDelay + maxDist * MS_PER_ROW);
    for (const m of movements) {
        const el = getCellEl(m.r, m.c);
        if (!el) continue;
        if (m.isNew) {
            el.style.transform = `translateY(${-m.distance * step}px) scale(0)`;
            el.style.opacity = '0';
        } else {
            el.style.transform = `translateY(${-m.distance * step}px)`;
        }
    }
    elGrid.style.visibility = '';
    await new Promise(r => requestAnimationFrame(r));
    for (const m of movements) {
        const el = getCellEl(m.r, m.c);
        if (!el) continue;
        const totalDur = totalTime - m.delay;
        if (m.isNew) {
            const appearEnd = Math.min(0.25, 150 / totalDur);
            const anim = el.animate([
                { transform: `translateY(${-m.distance * step}px) scale(0)`, opacity: 0, offset: 0, easing: 'ease-out' },
                { transform: `translateY(${-m.distance * step}px) scale(1.15)`, opacity: 1, offset: appearEnd * 0.6, easing: 'ease-out' },
                { transform: `translateY(${-m.distance * step}px) scale(1)`, opacity: 1, offset: appearEnd, easing: 'ease-in' },
                { transform: 'translateY(0) scale(1)', opacity: 1, offset: 1 }
            ], { duration: totalDur, delay: m.delay, fill: 'backwards' });
            anim.onfinish = () => { el.style.transform = ''; el.style.opacity = ''; };
        } else {
            const anim = el.animate([
                { transform: `translateY(${-m.distance * step}px)` },
                { transform: 'translateY(0)' }
            ], { duration: totalDur, delay: m.delay, easing: 'ease-in', fill: 'backwards' });
            anim.onfinish = () => { el.style.transform = ''; };
        }
    }
    await sleep(totalTime + 50);
}

// ─── clear groups ───

async function clearGroups(groups) {
    const allKeys = new Set();
    const specials = [];
    let totalPts = 0;
    for (const group of groups) {
        const type = grid[group[0][0]][group[0][1]];
        totalPts += group.length * 10;
        const info = classifyMatch(group);
        totalPts += group.length * 10 * (info.multiplier - 1);
        for (const [r, c] of group) allKeys.add(`${r},${c}`);
        if (info.multiplier > 1) {
            const rows = group.map(([r]) => r);
            const cols = group.map(([_, c]) => c);
            const ar = (Math.min(...rows) + Math.max(...rows)) / 2;
            const ac = (Math.min(...cols) + Math.max(...cols)) / 2;
            specials.push({ info, pts: group.length * 10 * info.multiplier, ar, ac, type, groupLen: group.length });
        }
    }

    // Handle plus/color-blast — find all same-color cells on the board
    let blastInfo = null;
    for (const s of specials) {
        if (s.info.type !== 'plus') continue;
        const blastCells = [];
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (grid[r][c] === s.type && !allKeys.has(`${r},${c}`)) {
                    blastCells.push([r, c]);
                    allKeys.add(`${r},${c}`);
                }
            }
        }
        if (blastCells.length > 0) {
            const extraPts = blastCells.length * 10 * 4;
            totalPts += extraPts;
            const blastSet = new Set(blastCells.map(([r,c]) => `${r},${c}`));
            blastInfo = { blastCells, blastSet, extraPts, ar: s.ar, ac: s.ac, type: s.type, pts: s.pts };
        }
        break;
    }

    // Pick the best special to announce (blast beats everything, then by length)
    let bestSpecial = null;
    for (const s of specials) {
        const rank = (s.info.type === 'plus' ? 10000 : 0) + s.groupLen;
        if (!bestSpecial || rank > bestSpecial.rank) bestSpecial = { s, rank };
    }

    // Track consecutive Sweet! matches across cascade steps
    if (bestSpecial && bestSpecial.s.info.type === 'L/T') {
        sweetStreak++;
    } else {
        sweetStreak = 0;
    }

    score += totalPts;
    updateUI();
    if (totalPts > 0 && groups.length > 0) {
        const first = groups[0][0];
        const el = getCellEl(first[0], first[1]);
        if (el) {
            const rect = el.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2 + 10;
            showScorePopup(cx + (Math.random() - 0.5) * 30, cy, `+${totalPts}`, totalPts > 60);
        }
    }

    let hasSpecial = false;
    let blastExtraWait = 0;
    for (const s of specials) {
        const el = getCellEl(Math.round(s.ar), Math.round(s.ac));
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const isBest = bestSpecial && bestSpecial.s === s;

        if (s.info.type === 'plus' && blastInfo) {
            if (!isBest) {
                spawnParticles(cx, cy, [ALL_COLORS[s.type], '#ffd93d', '#fff'], 8, false);
                hasSpecial = true;
                continue;
            }

            showAnnouncement('✚ Rainbow Blast!');
            showScorePopup(cx, cy - 20, `+${s.pts + blastInfo.extraPts}`, true);
            const colors = [ALL_COLORS[s.type], '#ffd93d', '#fff'];
            spawnParticles(cx, cy, colors, 40, true);
            screenShake(3.5);

            // White flash overlay
            const flash = document.createElement('div');
            flash.style.cssText = 'position:fixed;inset:0;z-index:105;background:white;pointer-events:none;opacity:0;';
            document.body.appendChild(flash);
            flash.animate([{ opacity:0.4 },{ opacity:0 }], { duration:350, easing:'ease-out' }).onfinish = () => flash.remove();

            // Multiple expanding shock rings
            for (let i = 0; i < 3; i++) {
                setTimeout(() => {
                    const ring = document.createElement('div');
                    const color = i === 1 ? ALL_COLORS[s.type] : '#fff';
                    ring.style.cssText = `position:fixed;left:${cx}px;top:${cy}px;width:0;height:0;border-radius:50%;border:3px solid ${color};box-shadow:0 0 40px ${ALL_COLORS[s.type]};pointer-events:none;z-index:100;transform:translate(-50%,-50%);`;
                    document.body.appendChild(ring);
                    ring.animate([
                        { width:'0', height:'0', opacity:0.9 },
                        { width:'800px', height:'800px', opacity:0 }
                    ], { duration: i === 1 ? 600 : 450, easing: 'ease-out' }).onfinish = () => ring.remove();
                }, i * 120);
            }

            // Staggered blast — each cell explodes dramatically
            for (const [br, bc] of blastInfo.blastCells) {
                const bel = getCellEl(br, bc);
                if (!bel) continue;
                const dist = Math.sqrt((br - blastInfo.ar) ** 2 + (bc - blastInfo.ac) ** 2);
                const delay = dist * 35;
                bel.animate([
                    { transform: 'scale(1)', opacity: 1, boxShadow: '0 0 0 rgba(255,255,255,0)' },
                    { transform: 'scale(2)', opacity: 0.85, boxShadow: '0 0 60px rgba(255,255,255,0.8)' },
                    { transform: 'scale(0) translateY(-35px)', opacity: 0, boxShadow: '0 0 0 rgba(255,255,255,0)' }
                ], { duration: 600, delay, easing: 'ease-out' });
                const brect = bel.getBoundingClientRect();
                setTimeout(() => {
                    spawnParticles(brect.left + brect.width / 2, brect.top + brect.height / 2, colors, 12, true);
                }, delay + 200);
            }

            blastExtraWait = 800;
            hasSpecial = true;

        } else if (isBest) {
            const name = s.info.type === 'L/T' && sweetStreak > 1 ? `Sweet! ×${sweetStreak}` : s.info.name;
            showAnnouncement(name);
            showScorePopup(cx, cy + 15, `+${s.pts}`, true);
            const colors = [ALL_COLORS[s.type], '#ffd93d', '#fff'];
            spawnParticles(cx, cy, colors, 18, true);
            hasSpecial = true;
        } else {
            spawnParticles(cx, cy, [ALL_COLORS[s.type], '#ffd93d', '#fff'], 8, false);
            hasSpecial = true;
        }
    }

    if (!hasSpecial && allKeys.size > 0) {
        const firstKey = [...allKeys].slice(0, 2);
        for (const key of firstKey) {
            const [r, c] = key.split(',').map(Number);
            const el = getCellEl(r, c);
            if (el) {
                const rect = el.getBoundingClientRect();
                spawnParticles(rect.left + rect.width / 2, rect.top + rect.height / 2,
                    ['rgba(255,255,255,0.3)'], 5);
            }
        }
    }

    // Animate normal matched cells, skip blast cells
    for (const key of allKeys) {
        const [r, c] = key.split(',').map(Number);
        const el = getCellEl(r, c);
        if (el) {
            if (blastInfo && blastInfo.blastSet.has(key)) { grid[r][c] = 'e'; continue; }
            el.classList.add('matched');
            el.animate([
                { transform: 'scale(1)', opacity: 1 },
                { transform: 'scale(1.2)', opacity: 0.8 },
                { transform: 'scale(0.3)', opacity: 0 }
            ], { duration: 450, easing: 'ease-out' });
        }
        grid[r][c] = 'e';
    }

    if (hasSpecial && !blastInfo) screenShake(1 + specials.length * 0.4);
    await sleep(480 + blastExtraWait);
}

// ─── hint system ───

const HINT_DELAY = 5000;
let hintTimeout = null;
let currentHint = null;

function findHint() {
    const dirs = [[0,1],[1,0]];
    const hints = [];
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (grid[r][c] === 'e') continue;
            for (const [dr, dc] of dirs) {
                const nr = r + dr, nc = c + dc;
                if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || grid[nr][nc] === 'e') continue;
                const a = grid[r][c], b = grid[nr][nc];
                grid[r][c] = b; grid[nr][nc] = a;
                const has = findMatchGroups().some(g =>
                    g.some(([cr,cc]) => (cr===r&&cc===c) || (cr===nr&&cc===nc))
                );
                grid[r][c] = a; grid[nr][nc] = b;
                if (has) hints.push({ r1:r, c1:c, r2:nr, c2:nc });
            }
        }
    }
    if (hints.length === 0) return null;
    return hints[Math.floor(Math.random() * hints.length)];
}

function clearHint() {
    if (hintTimeout) { clearTimeout(hintTimeout); hintTimeout = null; }
    if (!currentHint) return;
    const e1 = getCellEl(currentHint.r1, currentHint.c1);
    const e2 = getCellEl(currentHint.r2, currentHint.c2);
    if (e1) e1.classList.remove('cell-hint');
    if (e2) e2.classList.remove('cell-hint');
    currentHint = null;
}

function showHint(hint) {
    clearHint();
    currentHint = hint;
    const e1 = getCellEl(hint.r1, hint.c1);
    const e2 = getCellEl(hint.r2, hint.c2);
    if (e1) e1.classList.add('cell-hint');
    if (e2) e2.classList.add('cell-hint');
}

function scheduleHint() {
    clearHint();
    if (isProcessing) return;
    hintTimeout = setTimeout(() => {
        if (isProcessing) return;
        const h = findHint();
        if (h) showHint(h);
    }, HINT_DELAY);
}

async function animateSwap(r1, c1, r2, c2) {
    const el1 = getCellEl(r1, c1);
    const el2 = getCellEl(r2, c2);
    if (!el1 || !el2) return;
    const r1r = el1.getBoundingClientRect();
    const r2r = el2.getBoundingClientRect();
    const dx = r2r.left - r1r.left;
    const dy = r2r.top - r1r.top;
    el1.animate([
        { transform: 'translate(0,0)' },
        { transform: `translate(${dx}px,${dy}px)` }
    ], { duration: 180, easing: 'ease-in-out' });
    el2.animate([
        { transform: 'translate(0,0)' },
        { transform: `translate(${-dx}px,${-dy}px)` }
    ], { duration: 180, easing: 'ease-in-out' });
    await sleep(180);
}

async function processSwap(r1, c1, r2, c2) {
    if (isProcessing) return;
    clearHint();
    isProcessing = true;
    selectedCell = null;
    updateCellSelection();

    const a = grid[r1][c1];
    const b = grid[r2][c2];

    await animateSwap(r1, c1, r2, c2);

    grid[r1][c1] = b;
    grid[r2][c2] = a;
    renderGrid();

    const allGroups = findMatchGroups();
    const filtered = allGroups.filter(g =>
        g.some(([r, c]) => (r === r1 && c === c1) || (r === r2 && c === c2))
    );

    if (filtered.length === 0) {
        await animateSwap(r1, c1, r2, c2);
        grid[r1][c1] = a;
        grid[r2][c2] = b;
        renderGrid();
        const el1 = getCellEl(r1, c1);
        const el2 = getCellEl(r2, c2);
        if (el1) el1.classList.add('invalid');
        if (el2) el2.classList.add('invalid');
        await sleep(350);
        isProcessing = false;
        scheduleHint();
        return;
    }

    comboCount = 0;
    sweetStreak = 0;
    let currentGroups = filtered;
    while (currentGroups.length > 0) {
        comboCount++;
        await clearGroups(currentGroups);
        await applyGravity();
        currentGroups = findMatchGroups();
    }

    movesLeft--;
    if (comboCount >= 2) showCombo(comboCount);
    updateUI();

    const lv = getLevel();
    if (score >= lv.target) {
        await sleep(400);
        levelComplete(lv);
    } else if (movesLeft <= 0) {
        await sleep(400);
        outOfMoves();
    }

    isProcessing = false;
    if (score < lv.target && movesLeft > 0) scheduleHint();
}

// ─── UI ───

function updateUI() {
    const lv = getLevel();
    elLevel.textContent = level + 1;
    elScore.textContent = score;
    elTarget.textContent = lv.target;
    elMoves.textContent = movesLeft;
    const pct = Math.min(100, (score / lv.target) * 100);
    elProgressFill.style.width = pct + '%';

    const total = lv.moves;
    const used = total - movesLeft;
    const ratio = used / total;
    let stars = 0;
    if (score >= lv.target) {
        if (ratio <= 0.40) stars = 3;
        else if (ratio <= 0.65) stars = 2;
        else stars = 1;
    }
    document.querySelectorAll('#stars-bar .star-s').forEach((s, i) => {
        s.classList.toggle('on', i < stars);
    });
}

function updateCellSelection() {
    elGrid.querySelectorAll('.cell').forEach(el => el.classList.remove('selected'));
    if (selectedCell) {
        const el = getCellEl(selectedCell.r, selectedCell.c);
        if (el) el.classList.add('selected');
    }
}

// ─── screens ───

function showHome() {
    clearHint();
    elHome.classList.remove('hidden');
    elGame.classList.add('hidden');
    elOverlay.classList.remove('show');
    renderLevelGrid();
}

function showGame() {
    elHome.classList.add('hidden');
    elGame.classList.remove('hidden');
    elOverlay.classList.remove('show');
}

// ─── level progress ───

const SAVE_KEY = 'candy_slide_progress';

function loadProgress() {
    try {
        const data = JSON.parse(localStorage.getItem(SAVE_KEY));
        if (data && data.length === LEVELS.length) { levelProgress = data; return; }
    } catch (_) {}
    levelProgress = LEVELS.map((_, i) => ({ unlocked: i === 0, stars: 0, best: 0 }));
}

function saveProgress() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(levelProgress)); } catch (_) {}
}

// ─── level select ───

function renderLevelGrid() {
    elLevelGrid.innerHTML = '';
    LEVELS.forEach((lv, i) => {
        const btn = document.createElement('button');
        btn.className = 'lvl-btn';
        const prog = levelProgress[i];
        if (!prog.unlocked) {
            btn.classList.add('locked');
            btn.innerHTML = `<span class="lvl-num">${i + 1}</span>`;
        } else if (prog.stars > 0) {
            btn.classList.add('cleared');
            btn.innerHTML = `<span class="lvl-num">${i + 1}</span>
                <span class="lvl-stars">${[0,1,2].map(j => `<span${j < prog.stars ? ' class="on"' : ''}></span>`).join('')}</span>`;
        } else {
            btn.classList.add('unlocked');
            btn.innerHTML = `<span class="lvl-num">${i + 1}</span>`;
        }
        if (prog.unlocked) {
            btn.addEventListener('click', () => startLevel(i));
        }
        elLevelGrid.appendChild(btn);
    });
}

// ─── start level ───

function updateGridSize() {
    const lv = getLevel();
    elGrid.style.gridTemplateColumns = `repeat(${lv.cols}, 1fr)`;
    elGrid.style.setProperty('--grid-ratio', `${lv.cols} / ${lv.rows}`);
    elGrid.style.setProperty('--grid-n', lv.cols);
    elGrid.style.setProperty('--grid-d', lv.rows);
}

function showLoadingScreen() {
    const candies = ['pink','orange','blue','red','green','yellow'];
    const c = candies[Math.floor(Math.random() * candies.length)];
    elLoading.querySelector('#loading-candy').style.backgroundImage = `url(assets/${c}.png)`;
    elLoading.classList.remove('hidden');
    elLoading.style.transform = '';
    elLoading.style.opacity = '';
    elLoading.style.transition = '';
    return sleep(1000);
}

function hideLoadingScreen() {
    return new Promise(resolve => {
        const candyEl = elLoading.querySelector('#loading-candy');

        // Stop CSS bounce, pop the candy
        candyEl.style.animation = 'none';
        candyEl.animate([
            { transform: 'scale(1) rotate(0deg)', opacity: 1 },
            { transform: 'scale(1.5) rotate(180deg)', opacity: 0.8, offset: 0.35 },
            { transform: 'scale(0) rotate(360deg)', opacity: 0 }
        ], { duration: 450, easing: 'ease-out' });

        // Slide the whole panel up
        elLoading.style.transition = 'transform 0.5s cubic-bezier(.4,0,.2,1)';
        elLoading.style.transform = 'translateY(-100vh)';

        setTimeout(() => {
            elLoading.classList.add('hidden');
            elLoading.style.transition = '';
            elLoading.style.transform = '';
            candyEl.style.animation = '';
            resolve();
        }, 550);
    });
}

async function startLevel(idx) {
    level = idx;
    const lv = getLevel();
    ROWS = lv.rows;
    COLS = lv.cols;
    score = 0;
    movesLeft = lv.moves;
    selectedCell = null;
    isProcessing = false;
    comboCount = 0;
    sweetStreak = 0;

    updateGridSize();

    // Show loading for at least 1s (candy bounces)
    await showLoadingScreen();

    // Build board while loading is fully visible
    initGrid();
    renderGrid();

    // Show game screen behind loading, ready to be revealed
    showGame();
    updateUI();

    // Shrink all cells so they can pop into view
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const el = getCellEl(r, c);
            if (el) el.style.transform = 'scale(0.35)';
        }
    }

    await new Promise(r => requestAnimationFrame(r));

    // Slide loading up (candy pops as it goes)
    await hideLoadingScreen();

    // Brief pause so player sees the board before candies pop
    await sleep(120);

    // All board cells pop at once
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const el = getCellEl(r, c);
            if (!el) continue;
            el.animate([
                { transform: 'scale(0.35)', opacity: 0.3 },
                { transform: 'scale(1.12)', opacity: 1, offset: 0.5 },
                { transform: 'scale(1)', opacity: 1 }
            ], { duration: 450, easing: 'ease-out' });
            el.style.transform = '';
        }
    }
    await sleep(500);

    scheduleHint();
}

// ─── level end ───

function calcStars() {
    const lv = getLevel();
    const used = lv.moves - movesLeft;
    const ratio = used / lv.moves;
    if (score < lv.target) return 0;
    if (ratio <= 0.40) return 3;
    if (ratio <= 0.65) return 2;
    return 1;
}

async function levelComplete() {
    clearHint();
    const stars = calcStars();
    const prog = levelProgress[level];
    if (stars > prog.stars) prog.stars = stars;
    if (score > prog.best) prog.best = score;
    prog.unlocked = true;
    if (level + 1 < LEVELS.length) levelProgress[level + 1].unlocked = true;
    saveProgress();

    elModalTitle.textContent = 'Level Complete!';
    elModalTitle.className = 'complete';
    elModalScore.textContent = `Score: ${score}  •  Moves left: ${movesLeft}`;
    elStarLg.forEach((s, i) => s.className = 'star-lg');
    elOverlay.classList.add('show');

    // Stagger star reveal
    for (let i = 0; i < stars; i++) {
        await sleep(300);
        elStarLg[i].classList.add('on');
        if (i === stars - 1 && stars >= 2) {
            // Particle burst on last star
            const rect = elStarLg[i].getBoundingClientRect();
            spawnParticles(rect.left + rect.width / 2, rect.top + rect.height / 2,
                ['#ffd93d', '#ff6b9d', '#fff'], 25, true);
        }
    }

    if (level + 1 >= LEVELS.length) {
        elModalBtn.textContent = 'Back to Levels';
        elModalBtn.onclick = () => showHome();
    } else {
        elModalBtn.textContent = 'Next Level';
        elModalBtn.onclick = () => { elOverlay.classList.remove('show'); startLevel(level + 1); };
    }
    elModalHome.onclick = () => showHome();
    await sleep(300);
    if (stars >= 3) screenShake(1.5);
}

async function outOfMoves() {
    clearHint();
    elModalTitle.textContent = 'Out of Moves';
    elModalTitle.className = 'gameover';
    elModalScore.textContent = `Score: ${score}`;
    elStarLg.forEach(s => s.className = 'star-lg');
    elOverlay.classList.add('show');
    elModalBtn.textContent = 'Retry';
    elModalBtn.onclick = () => { elOverlay.classList.remove('show'); startLevel(level); };
    elModalHome.onclick = () => showHome();
}

// ─── pointer events ───

let pointerStart = null;

function attachEvents() {
    elGrid.addEventListener('pointerdown', e => {
        if (isProcessing) return;
        clearHint();
        const cell = e.target.closest('.cell');
        if (!cell) return;
        pointerStart = { r: +cell.dataset.r, c: +cell.dataset.c, x: e.clientX, y: e.clientY };
        e.preventDefault();
    });

    elGrid.addEventListener('pointermove', e => {
        if (!pointerStart || isProcessing) return;
        const dx = e.clientX - pointerStart.x;
        const dy = e.clientY - pointerStart.y;
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
            let dr = 0, dc = 0;
            if (Math.abs(dx) > Math.abs(dy)) dc = dx > 0 ? 1 : -1;
            else dr = dy > 0 ? 1 : -1;
            const r2 = pointerStart.r + dr, c2 = pointerStart.c + dc;
            if (r2 >= 0 && r2 < ROWS && c2 >= 0 && c2 < COLS) {
                selectedCell = null;
                updateCellSelection();
                processSwap(pointerStart.r, pointerStart.c, r2, c2);
            }
            pointerStart = null;
            e.preventDefault();
        }
    });

    elGrid.addEventListener('pointerup', e => {
        if (!pointerStart) return;
        const { r, c } = pointerStart;
        pointerStart = null;
        if (isProcessing) return;
        const cell = getCellEl(r, c);
        if (!cell) return;
        if (selectedCell) {
            const sr = selectedCell.r, sc = selectedCell.c;
            if (sr === r && sc === c) {
                selectedCell = null;
            } else if (Math.abs(r - sr) + Math.abs(c - sc) === 1) {
                processSwap(sr, sc, r, c);
                selectedCell = null;
            } else {
                selectedCell = { r, c };
            }
        } else {
            selectedCell = { r, c };
        }
        updateCellSelection();
    });

    elGrid.addEventListener('pointercancel', () => { pointerStart = null; });
    elBtnBack.addEventListener('click', showHome);
}

// ─── init ───

document.addEventListener('DOMContentLoaded', () => {
    initDOM();
    attachEvents();
    loadProgress();
    showHome();
    window.addEventListener('resize', () => {
        if (!elHome.classList.contains('hidden')) return;
        updateGridSize();
    });
});
