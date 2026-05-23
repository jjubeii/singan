// ===================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====================

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ===================== РЕПЛИКИ ТИМО =====================

const TIMO_DIALOGS = {
    start: "Тимо: «Ну что, проверим твоего дрона. Только не врежься в стену, как в прошлый раз».",
    sense_broken: "Тимо: «Ага! Сенсор показывает: клетка сломана. Без FIX ты отсюда не уйдёшь».",
    fix_success: "Тимо: «Отлично, подлатал! Двигай дальше».",
    collect: "Тимо: «Вот он, предмет! Забирай и бегом на финиш».",
    wrong_dir: "Тимо: «Эй, ты куда повернул? Проверь DIR: 0-вправо, 1-вверх, 2-влево, 3-вниз».",
    wall_crash: "Тимо: «Я же говорил – стена! Откатывай программу и думай, куда ты DIR повернул».",
    no_hlt: "Тимо: «Программа должна заканчиваться HLT. Иначе дрон будет болтаться без дела».",
    not_finish: "Тимо: «Дрон не на финише. Посмотри на координаты: тебе нужно на X=FINISH_X, Y=FINISH_Y».",
    items_left: "Тимо: «Не все предметы собраны! Вернись и проверь, может, забыл COLLECT».",
    success: "Тимо: «А ты не безнадёжен! Пара таких починок – и можешь открывать свою мастерскую. Ладно, забирай свои кредиты».",
    server_error: "Тимо: «Что-то сервер барахлит... Но ты не переживай, мы это починим»."
};

function timoSays(key) {
    const el = document.getElementById('timo-message');
    if (el) {
        el.innerHTML = `<span style="color: #ffcc00;">${TIMO_DIALOGS[key]}</span>`;
    }
}

// ===================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ (сетка) =====================

let gridCells = {};
let currentDroneCell = null;

// ===================== РАБОТА С СЕТКОЙ =====================

function parseGrid() {
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        const x = parseInt(cell.dataset.x);
        const y = parseInt(cell.dataset.y);
        gridCells[`${x},${y}`] = cell;
    });
}

function placeDrone(x, y, direction) {
    // Удаляем старый спрайт
    if (currentDroneCell) {
        const oldSprite = currentDroneCell.querySelector('.drone-sprite');
        if (oldSprite) oldSprite.remove();
    }
    // Находим новую клетку
    const key = `${x},${y}`;
    const cell = gridCells[key];
    if (cell) {
        currentDroneCell = cell;
        // Создаём спрайт
        const sprite = document.createElement('div');
        sprite.classList.add('drone-sprite');
        // Устанавливаем поворот в зависимости от направления (по умолчанию 0 = вправо)
        const rotationMap = { 0: 0, 1: 90, 2: 180, 3: 270 };
        sprite.style.transform = `rotate(${rotationMap[direction] || 0}deg)`;
        cell.appendChild(sprite);
    }
}

function resetSimulation() {
    if (currentDroneCell) {
        const oldSprite = currentDroneCell.querySelector('.drone-sprite');
        if (oldSprite) oldSprite.remove();
        currentDroneCell = null;
    }
    const timoDiv = document.getElementById('timo-message');
    if (timoDiv) timoDiv.innerHTML = '';
    const regSpans = document.querySelectorAll('#registers span[id^="reg-"]');
    regSpans.forEach(span => { span.textContent = '0'; });
}

function updateRegisters(regs) {
    for (const [reg, val] of Object.entries(regs)) {
        const span = document.getElementById(`reg-${reg}`);
        if (span) span.textContent = val;
    }
}

// ===================== ВИЗУАЛИЗАЦИЯ СТЕКА =====================

function updateStackVisual(stackArray) {
    const stackDiv = document.getElementById('stack-visual');
    if (!stackDiv) return;
    let html = '';
    for (let i = stackArray.length - 1; i >= 0; i--) {
        html += `<div class="stack-item">${stackArray[i]}</div>`;
    }
    if (stackArray.length === 0) {
        html = '<div class="stack-item empty">пусто</div>';
    }
    stackDiv.innerHTML = html;
}

// ===================== КЛИЕНТСКИЙ ИНТЕРПРЕТАТОР =====================

async function runClientSimulation(programText) {
    const reg = { AX: 0, BX: 0, CX: 0, DX: 0, DIR: 0, SP: 0, ZF: 0 };
    const stack = [];
    updateRegisters(reg);
    updateStackVisual(stack);

    let x = START_X, y = START_Y;
    let stopped = false;

    const rawLines = programText.trim().split('\n');
    const labels = {};
    const dataSeg = {};
    const parsedLines = [];

    for (let i = 0; i < rawLines.length; i++) {
        let line = rawLines[i].trim();
        if (line.includes(';')) {
            line = line.split(';')[0].trim();
        }
        if (line === '') continue;

        if (line.includes(' DB ')) {
            const parts = line.split(' ');
            const varName = parts[0];
            const varValue = parseInt(parts[2]);
            dataSeg[varName] = varValue;
            continue;
        }

        if (line.endsWith(':')) {
            labels[line.slice(0, -1)] = parsedLines.length;
            continue;
        }

        parsedLines.push(line);
    }

    let ip = 0;
    let broken = BROKEN_CELLS.map(c => [...c]);
    let items = ITEMS.map(c => [...c]);

    // Стартовое размещение дрона с учётом направления
    placeDrone(x, y, reg.DIR);
    timoSays('start');
    await delay(500);

    while (ip >= 0 && ip < parsedLines.length && !stopped) {
        const line = parsedLines[ip].trim();
        const parts = line.split(' ');
        const opcode = parts[0];

        if (opcode === 'MOV') {
            reg[parts[1]] = (parts[2] in dataSeg) ? dataSeg[parts[2]] : parseInt(parts[2]);

            // Если изменился DIR – сразу поворачиваем спрайт дрона
            if (parts[1] === 'DIR') {
                if (currentDroneCell) {
                    const sprite = currentDroneCell.querySelector('.drone-sprite');
                    if (sprite) {
                        const rotationMap = { 0: 0, 1: 90, 2: 180, 3: 270 };
                        sprite.style.transform = `rotate(${rotationMap[reg.DIR] || 0}deg)`;
                    }
                }
            }
        } else if (opcode === 'ADD') {
            reg[parts[1]] += (parts[2] in dataSeg) ? dataSeg[parts[2]] : parseInt(parts[2]);
        } else if (opcode === 'SUB') {
            reg[parts[1]] -= (parts[2] in dataSeg) ? dataSeg[parts[2]] : parseInt(parts[2]);
        } else if (opcode === 'INC') {
            reg[parts[1]] += 1;
        } else if (opcode === 'DEC') {
            reg[parts[1]] -= 1;
        } else if (opcode === 'CMP') {
            const val = (parts[2] in dataSeg) ? dataSeg[parts[2]] : parseInt(parts[2]);
            reg.ZF = (reg[parts[1]] === val) ? 1 : 0;
        } else if (opcode === 'PUSH') {
            stack.push(reg[parts[1]]);
            updateStackVisual(stack);
        } else if (opcode === 'POP') {
            if (stack.length === 0) {
                return { success: false, error: 'Стек пуст!' };
            }
            reg[parts[1]] = stack.pop();
            updateStackVisual(stack);
        } else if (opcode === 'CALL') {
            stack.push(ip + 1);
            updateStackVisual(stack);
            ip = labels[parts[1]];
            await delay(200);
            continue;
        } else if (opcode === 'RET') {
            if (stack.length === 0) {
                return { success: false, error: 'Стек пуст!' };
            }
            ip = stack.pop();
            updateStackVisual(stack);
            await delay(200);
            continue;
        } else if (opcode === 'JMP') {
            ip = labels[parts[1]];
            await delay(200);
            continue;
        } else if (opcode === 'JZ') {
            if (reg.ZF === 1) {
                ip = labels[parts[1]];
                await delay(200);
                continue;
            }
        } else if (opcode === 'JNZ') {
            if (reg.ZF === 0) {
                ip = labels[parts[1]];
                await delay(200);
                continue;
            }
        } else if (opcode === 'STEP') {
            const d = reg.DIR;
            let nx = x, ny = y;
            if (d === 0) nx = x + 1;
            else if (d === 1) ny = y - 1;
            else if (d === 2) nx = x - 1;
            else if (d === 3) ny = y + 1;
            else {
                timoSays('wrong_dir');
                return { success: false, error: `Неверное направление DIR=${d}` };
            }
            if (nx < 0 || nx >= WIDTH || ny < 0 || ny >= HEIGHT) {
                timoSays('wall_crash');
                return { success: false, error: 'Дрон врезался в стену!' };
            }
            x = nx; y = ny;
            // Перемещаем дрона с текущим направлением
            placeDrone(x, y, reg.DIR);
            await delay(400);
        } else if (opcode === 'SENSE') {
            const isBroken = broken.some(c => c[0] === x && c[1] === y);
            reg.AX = isBroken ? 1 : 0;
            if (isBroken) timoSays('sense_broken');
        } else if (opcode === 'FIX') {
            const idx = broken.findIndex(c => c[0] === x && c[1] === y);
            if (idx !== -1) {
                broken.splice(idx, 1);
                const cell = gridCells[`${x},${y}`];
                if (cell) cell.classList.remove('broken');
                reg.AX = 0;
                timoSays('fix_success');
                await delay(400);
            } else {
                return { success: false, error: 'Нечего чинить!' };
            }
        } else if (opcode === 'COLLECT') {
            const idx = items.findIndex(c => c[0] === x && c[1] === y);
            if (idx !== -1) {
                items.splice(idx, 1);
                const cell = gridCells[`${x},${y}`];
                if (cell) cell.classList.add('collected');
                timoSays('collect');
                await delay(400);
            } else {
                return { success: false, error: 'Нечего собирать!' };
            }
        } else if (opcode === 'HLT') {
            stopped = true;
            break;
        } else {
            return { success: false, error: `Неизвестная инструкция: ${opcode}` };
        }

        ip++;
        updateRegisters(reg);
        updateStackVisual(stack);
        await delay(200);
    }

    if (!stopped) {
        timoSays('no_hlt');
        return { success: false, error: 'Программа не завершилась HLT' };
    }
    if (x !== FINISH_X || y !== FINISH_Y) {
        timoSays('not_finish');
        return { success: false, error: 'Дрон не на финише' };
    }
    if (items.length > 0) {
        timoSays('items_left');
        return { success: false, error: 'Не все предметы собраны' };
    }
    timoSays('success');
    return { success: true };
}

// ===================== КОНСТРУКТОР ПРОГРАММ =====================

const COMMANDS = {
    MOV: { args: ['reg', 'number'], desc: 'MOV REG, число' },
    ADD: { args: ['reg', 'number'], desc: 'ADD REG, число' },
    SUB: { args: ['reg', 'number'], desc: 'SUB REG, число' },
    INC: { args: ['reg'], desc: 'INC REG' },
    DEC: { args: ['reg'], desc: 'DEC REG' },
    CMP: { args: ['reg', 'number'], desc: 'CMP REG, число' },
    JMP: { args: ['label'], desc: 'JMP метка' },
    JZ:  { args: ['label'], desc: 'JZ метка' },
    JNZ: { args: ['label'], desc: 'JNZ метка' },
    STEP: { args: [], desc: 'STEP' },
    SENSE: { args: [], desc: 'SENSE' },
    FIX: { args: [], desc: 'FIX' },
    COLLECT: { args: [], desc: 'COLLECT' },
    HLT: { args: [], desc: 'HLT' }
};

const COMMON_LABELS = ['LOOP', 'START', 'END', 'NEXT', 'SKIP', 'FIX', 'EXIT'];

function insertProgramLine(fullCommand) {
    const ta = document.getElementById('program');
    let text = ta.value;
    if (text.length > 0 && !text.endsWith('\n')) {
        text += '\n';
    }
    ta.value = text + fullCommand + '\n';
    ta.focus();
}

function buildRegPills(cmdName, needsNumber) {
    let html = `<span style="color:#ffcc00;font-family:monospace;">${cmdName}</span> `;
    ['AX', 'BX', 'CX', 'DX', 'DIR'].forEach(r => {
        html += `<span class="reg-pill" data-reg="${r}">${r}</span> `;
    });
    if (needsNumber) {
        html += `<div class="number-row" style="display:none;">
            <span class="number-widget">
                <span class="num-btn num-down">−</span>
                <input type="number" class="arg-input num-value" value="0" min="0" max="999">
                <span class="num-btn num-up">+</span>
            </span>
            <span class="enter-hint" style="cursor:pointer;">ENTER</span>
        </div>`;
    }
    return html;
}

function buildLabelPills(cmdName) {
    let html = `<span style="color:#ffcc00;font-family:monospace;">${cmdName}</span> `;
    COMMON_LABELS.forEach(lbl => {
        html += `<span class="label-pill" data-label="${lbl}">${lbl}</span> `;
    });
    html += `<span class="label-custom-pill">+</span>`;
    return html;
}

function resetEntry(entry) {
    if (entry.dataset.originalHTML) {
        entry.innerHTML = entry.dataset.originalHTML;
        entry.classList.remove('editing');
        delete entry.dataset.originalHTML;
    }
}

// ===================== ИНИЦИАЛИЗАЦИЯ =====================

document.addEventListener('DOMContentLoaded', function () {
    parseGrid();

    const runButton = document.getElementById('run-btn');
    const resetButton = document.getElementById('reset-btn');
    const programTextarea = document.getElementById('program');
    const outputDiv = document.getElementById('output');

    // Делегирование для кнопок +/-
    document.addEventListener('click', function (e) {
        const target = e.target;
        if (target.classList.contains('num-btn')) {
            e.preventDefault();
            e.stopPropagation();
            const widget = target.closest('.number-widget');
            if (!widget) return;
            const input = widget.querySelector('.num-value');
            if (!input) return;
            let val = parseInt(input.value) || 0;
            if (target.classList.contains('num-down')) {
                val = Math.max(0, val - 1);
            } else {
                val = Math.min(999, val + 1);
            }
            input.value = val;
        }
    });

    // In-place конструктор
    document.querySelectorAll('.cmd-entry').forEach(entry => {
        const cmdName = entry.dataset.cmd;
        const cmd = COMMANDS[cmdName];
        if (!cmd) return;

        entry.addEventListener('click', function onClick() {
            if (entry.classList.contains('editing')) return;

            if (cmd.args.length === 0) {
                insertProgramLine(cmdName);
                return;
            }

            const originalHTML = entry.innerHTML;
            entry.dataset.originalHTML = originalHTML;
            entry.classList.add('editing');

            if (cmd.args[0] === 'label') {
                entry.innerHTML = buildLabelPills(cmdName);
                entry.querySelectorAll('.label-pill').forEach(pill => {
                    pill.addEventListener('click', function(e) {
                        e.stopPropagation();
                        insertProgramLine(cmdName + ' ' + this.dataset.label);
                        resetEntry(entry);
                    });
                });
                const customPill = entry.querySelector('.label-custom-pill');
                if (customPill) {
                    customPill.addEventListener('click', function(e) {
                        e.stopPropagation();
                        entry.innerHTML = `<span style="color:#ffcc00;font-family:monospace;">${cmdName}</span> <input type="text" class="label-input" placeholder="метка">`;
                        const input = entry.querySelector('.label-input');
                        if (input) {
                            input.focus();
                            const handler = () => {
                                const val = input.value.trim() || 'metka';
                                insertProgramLine(cmdName + ' ' + val);
                                resetEntry(entry);
                            };
                            input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); handler(); } });
                            input.addEventListener('blur', handler);
                        }
                    });
                }
                return;
            }

            const needsNumber = cmd.args.includes('number');
            entry.innerHTML = buildRegPills(cmdName, needsNumber);

            entry.querySelectorAll('.reg-pill').forEach(pill => {
                pill.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const reg = this.dataset.reg;
                    entry.querySelectorAll('.reg-pill').forEach(p => p.classList.remove('selected'));
                    this.classList.add('selected');

                    if (!needsNumber) {
                        insertProgramLine(cmdName + ' ' + reg);
                        resetEntry(entry);
                    } else {
                        const numberRow = entry.querySelector('.number-row');
                        if (numberRow) {
                            numberRow.style.display = 'flex';
                            const numInput = numberRow.querySelector('.num-value');
                            const enterHint = numberRow.querySelector('.enter-hint');
                            if (numInput) {
                                numInput.value = 0;
                                setTimeout(() => numInput.focus(), 0);

                                numInput.addEventListener('keydown', function(ev) {
                                    if (ev.key === 'Enter' || ev.keyCode === 13) {
                                        ev.preventDefault();
                                        ev.stopPropagation();
                                        const val = numInput.value || '0';
                                        insertProgramLine(cmdName + ' ' + reg + ' ' + val);
                                        resetEntry(entry);
                                    }
                                });

                                if (enterHint) {
                                    enterHint.addEventListener('click', function(e) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const val = numInput.value || '0';
                                        insertProgramLine(cmdName + ' ' + reg + ' ' + val);
                                        resetEntry(entry);
                                    });
                                }
                            }
                        }
                    }
                });
            });
        });
    });

    resetButton.addEventListener('click', () => {
        programTextarea.value = '';
        resetSimulation();
        location.reload();
    });

    runButton.addEventListener('click', async () => {
        const program = programTextarea.value;
        if (!program.trim()) { timoSays('start'); return; }
        if (outputDiv) outputDiv.innerHTML = '<p>Выполнение...</p>';
        resetSimulation();

        document.querySelectorAll('.cell.broken').forEach(c => c.classList.remove('broken'));
        document.querySelectorAll('.cell.collected').forEach(c => c.classList.remove('collected'));
        document.querySelectorAll('.cell.item').forEach(c => c.classList.remove('item'));
        BROKEN_CELLS.forEach(([bx, by]) => { const cell = gridCells[`${bx},${by}`]; if (cell) cell.classList.add('broken'); });
        ITEMS.forEach(([ix, iy]) => { const cell = gridCells[`${ix},${iy}`]; if (cell) cell.classList.add('item'); });

        const simResult = await runClientSimulation(program);

        if (simResult.success) {
            if (outputDiv) outputDiv.innerHTML = '<p style="color:#4caf50;">✔ Симуляция: Дрон на финише!</p>';
        } else {
            if (outputDiv) outputDiv.innerHTML = `<p style="color:#f44336;">✘ Симуляция: ${simResult.error}</p>`;
            return;
        }

        const formData = new FormData();
        formData.append('program', program);
        try {
            const response = await fetch(window.location.href, {
                method: 'POST',
                headers: { 'X-CSRFToken': getCookie('csrftoken') },
                body: formData
            });
            const data = await response.json();
            if (data.success) {
                if (outputDiv) outputDiv.innerHTML += '<p style="color:#4caf50;">✔ Пазл засчитан!</p>';
                runButton.disabled = true;
            } else {
                if (outputDiv) outputDiv.innerHTML += `<p style="color:#f44336;">✘ Ошибка сервера: ${data.error}</p>`;
            }
        } catch (error) {
            timoSays('server_error');
            if (outputDiv) outputDiv.innerHTML += `<p style="color:#f44336;">Ошибка соединения: ${error.message}</p>`;
        }
    });
});