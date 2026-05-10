// === Вспомогательная функция для получения CSRF-токена из кук ===
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

// === Глобальные переменные для работы с сеткой ===
let gridCells = {};
let currentDroneCell = null;

// === Парсинг сетки: собираем все клетки в объект для быстрого доступа ===
function parseGrid() {
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        const x = parseInt(cell.dataset.x);
        const y = parseInt(cell.dataset.y);
        gridCells[`${x},${y}`] = cell;
    });
}

// === Анимация перемещения дрона ===
function placeDrone(x, y) {
    // Убираем класс 'drone' с предыдущей позиции
    if (currentDroneCell) {
        currentDroneCell.classList.remove('drone');
    }
    // Находим новую клетку и добавляем класс
    const key = `${x},${y}`;
    if (gridCells[key]) {
        currentDroneCell = gridCells[key];
        currentDroneCell.classList.add('drone');
    }
}

// === Сброс симуляции ===
function resetSimulation() {
    if (currentDroneCell) {
        currentDroneCell.classList.remove('drone');
        currentDroneCell = null;
    }
    document.getElementById('output').innerHTML = '';
}

// === Задержка для анимации ===
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// === Клиентский интерпретатор (пошаговая симуляция) ===
async function runClientSimulation(programText, startX, startY, finishX, finishY, brokenCells) {
    const lines = programText.split('\n');
    let pc = 0;
    let x = startX, y = startY, errFlag = 0;
    const labels = {};

    // Первый проход: собираем метки
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.endsWith(':')) labels[line.slice(0, -1)] = i + 1;
    }

    // Устанавливаем дрона на старт
    placeDrone(x, y);
    await delay(500); // начальная задержка

    while (pc >= 0 && pc < lines.length) {
        const line = lines[pc].trim();
        if (line === '' || line.endsWith(':')) { pc++; continue; }

        const parts = line.split(' ');
        const opcode = parts[0];

        if (opcode === 'MOV') {
            // Если дрон сломан, MOV не выполняется
            if (errFlag) { pc++; continue; }
            const dx = parseInt(parts[1]), dy = parseInt(parts[2]);
            const nx = x + dx, ny = y + dy;
            // Проверка границ
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
                return { success: false, error: 'Дрон врезался в стену!' };
            }
            x = nx; y = ny;
            placeDrone(x, y);
            // Проверяем, не попали ли на сломанную клетку
            if (brokenCells.some(c => c[0] === x && c[1] === y)) errFlag = 1;

        } else if (opcode === 'SNSR') {
            errFlag = brokenCells.some(c => c[0] === x && c[1] === y) ? 1 : 0;

        } else if (opcode === 'JFIX') {
            const label = parts[1];
            if (errFlag) {
                pc = labels[label] || pc;
                errFlag = 0; // починили
                continue;
            } else {
                pc++;
            }

        } else if (opcode === 'JMP') {
            const label = parts[1];
            pc = labels[label] || pc;
            continue;

        } else if (opcode === 'HLT') {
            break;
        }
        pc++;
        await delay(400); // задержка между шагами
    }

    if (x === finishX && y === finishY) return { success: true };
    else return { success: false, error: 'Дрон не достиг финиша' };
}

// === Инициализация после загрузки страницы ===
document.addEventListener('DOMContentLoaded', function() {
    // Парсим сетку
    parseGrid();

    // Получаем элементы кнопок
    const runButton = document.getElementById('run-btn');
    const resetButton = document.getElementById('reset-btn');
    const programTextarea = document.getElementById('program');
    const outputDiv = document.getElementById('output');

    // Обработчик кнопки "Сбросить"
    resetButton.addEventListener('click', function() {
        programTextarea.value = '';
        resetSimulation();
    });

    // Обработчик кнопки "Запустить"
    runButton.addEventListener('click', async function() {
        const program = programTextarea.value;
        outputDiv.innerHTML = '<p>Выполнение...</p>';
        resetSimulation();

        // Получаем данные о пазле из глобальных переменных, переданных в шаблон
        // (значения определены прямо в скрипте ниже)
        const simResult = await runClientSimulation(program, START_X, START_Y, FINISH_X, FINISH_Y, BROKEN_CELLS);

        if (simResult.success) {
            outputDiv.innerHTML = '<p style="color: #4caf50;">✔ Симуляция: Дрон на финише!</p>';
        } else {
            outputDiv.innerHTML = `<p style="color: #f44336;">✘ Симуляция: ${simResult.error}</p>`;
            return; // Если симуляция провалилась, не шлём запрос на сервер
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
                outputDiv.innerHTML += '<p style="color: #4caf50;">✔ Пазл официально засчитан!</p>';
            } else {
                outputDiv.innerHTML += `<p style="color: #f44336;">✘ Ошибка сервера: ${data.error}</p>`;
            }
        } catch (error) {
            outputDiv.innerHTML += `<p style="color: #f44336;">Ошибка соединения: ${error.message}</p>`;
        }
    });
});