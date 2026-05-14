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

function placeDrone(x, y) {
    if (currentDroneCell) {
        currentDroneCell.classList.remove('drone');
    }
    const key = `${x},${y}`;
    if (gridCells[key]) {
        currentDroneCell = gridCells[key];
        currentDroneCell.classList.add('drone');
    }
}

function resetSimulation() {
    if (currentDroneCell) {
        currentDroneCell.classList.remove('drone');
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

// ===================== КЛИЕНТСКИЙ ИНТЕРПРЕТАТОР =====================

async function runClientSimulation(programText) {
    const reg = {
        AX: 0, BX: 0, CX: 0, DX: 0, DIR: 0, ZF: 0
    };
    updateRegisters(reg);

    let x = START_X, y = START_Y;
    let stopped = false;
    const lines = programText.trim().split('\n');
    let ip = 0;

    // Используем глобальные переменные, созданные в шаблоне, напрямую
    let broken = BROKEN_CELLS.map(c => [...c]);
    let items = ITEMS.map(c => [...c]);

    // Сбор меток
    const labels = {};
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.endsWith(':')) labels[line.slice(0, -1)] = i + 1;
    }

    placeDrone(x, y);
    timoSays('start');
    await delay(500);

    while (ip >= 0 && ip < lines.length && !stopped) {
        const line = lines[ip].trim();
        if (line === '' || line.endsWith(':')) { ip++; continue; }
        const parts = line.split(' ');
        const opcode = parts[0];

        if (opcode === 'MOV') {
            const regName = parts[1];
            const val = parseInt(parts[2]);
            reg[regName] = val;
        } else if (opcode === 'ADD') {
            const regName = parts[1];
            const val = parseInt(parts[2]);
            reg[regName] += val;
        } else if (opcode === 'SUB') {
            const regName = parts[1];
            const val = parseInt(parts[2]);
            reg[regName] -= val;
        } else if (opcode === 'INC') {
            reg[parts[1]] += 1;
        } else if (opcode === 'DEC') {
            reg[parts[1]] -= 1;
        } else if (opcode === 'CMP') {
            const regName = parts[1];
            const val = parseInt(parts[2]);
            reg.ZF = (reg[regName] === val) ? 1 : 0;
        } else if (opcode === 'JMP') {
            const label = parts[1];
            if (labels[label] !== undefined) {
                ip = labels[label];
                updateRegisters(reg);
                continue;
            }
        } else if (opcode === 'JZ') {
            const label = parts[1];
            if (reg.ZF === 1 && labels[label] !== undefined) {
                ip = labels[label];
                updateRegisters(reg);
                continue;
            }
        } else if (opcode === 'JNZ') {
            const label = parts[1];
            if (reg.ZF === 0 && labels[label] !== undefined) {
                ip = labels[label];
                updateRegisters(reg);
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
            placeDrone(x, y);
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

// ===================== ИНИЦИАЛИЗАЦИЯ ПОСЛЕ ЗАГРУЗКИ СТРАНИЦЫ =====================

document.addEventListener('DOMContentLoaded', function () {
    parseGrid();

    const runButton = document.getElementById('run-btn');
    const resetButton = document.getElementById('reset-btn');
    const programTextarea = document.getElementById('program');
    const outputDiv = document.getElementById('output');

    // Вставка команды по клику
    document.querySelectorAll('.cmd-snippet').forEach(code => {
        code.addEventListener('click', function () {
            const text = this.textContent.trim();
            const command = text.split(' ')[0];
            programTextarea.value += command + ' ';
            programTextarea.focus();
        });
    });

    // Кнопка "Сбросить"
    resetButton.addEventListener('click', function () {
        programTextarea.value = '';
        resetSimulation();
        location.reload();
    });

    // Кнопка "Запустить"
    runButton.addEventListener('click', async function () {
        const program = programTextarea.value;
        if (!program.trim()) {
            timoSays('start');
            return;
        }
        if (outputDiv) outputDiv.innerHTML = '<p>Выполнение...</p>';
        resetSimulation();

        // Восстанавливаем классы клеток
        document.querySelectorAll('.cell.broken').forEach(c => c.classList.remove('broken'));
        document.querySelectorAll('.cell.collected').forEach(c => c.classList.remove('collected'));
        document.querySelectorAll('.cell.item').forEach(c => c.classList.remove('item'));

        // Восстанавливаем сломанные клетки и предметы из глобальных переменных
        BROKEN_CELLS.forEach(([bx, by]) => {
            const cell = gridCells[`${bx},${by}`];
            if (cell) cell.classList.add('broken');
        });
        ITEMS.forEach(([ix, iy]) => {
            const cell = gridCells[`${ix},${iy}`];
            if (cell) cell.classList.add('item');
        });

        const simResult = await runClientSimulation(program);

        if (simResult.success) {
            if (outputDiv) outputDiv.innerHTML = '<p style="color: #4caf50;">✔ Симуляция: Дрон на финише! Все предметы собраны.</p>';
        } else {
            if (outputDiv) outputDiv.innerHTML = `<p style="color: #f44336;">✘ Симуляция: ${simResult.error}</p>`;
            return;
        }

        // Серверная проверка (AJAX)
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
                if (outputDiv) outputDiv.innerHTML += '<p style="color: #4caf50;">✔ Пазл официально засчитан!</p>';
                runButton.disabled = true;
            } else {
                if (outputDiv) outputDiv.innerHTML += `<p style="color: #f44336;">✘ Ошибка сервера: ${data.error}</p>`;
            }
        } catch (error) {
            timoSays('server_error');
            if (outputDiv) outputDiv.innerHTML += `<p style="color: #f44336;">Ошибка соединения: ${error.message}</p>`;
        }
    });
});