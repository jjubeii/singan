import json

def run_program(program_text, puzzle):
    broken = json.loads(puzzle.broken_cells) if puzzle.broken_cells else []
    items = json.loads(puzzle.items) if puzzle.items else []
    collected = []
    x, y = puzzle.start_x, puzzle.start_y
    stopped = False
    steps = 0

    registers = {
        'AX': 0, 'BX': 0, 'CX': 0, 'DX': 0,
        'DIR': 0, 'SP': 0, 'ZF': 0
    }
    stack = []
    data_labels = {}
    labels = {}

    lines = program_text.strip().split('\n')
    parsed_lines = []

    # Первый проход: собираем метки и директивы DB, удаляем комментарии
    for line in lines:
        line = line.strip()
        # Удаляем комментарий (всё, что после символа ';')
        if ';' in line:
            line = line.split(';')[0].strip()
        if line == '':
            continue

        # Директива DB
        if ' DB ' in line:
            parts = line.split()
            var_name = parts[0]
            var_value = int(parts[2])
            data_labels[var_name] = var_value
            continue

        # Метка
        if line.endswith(':'):
            label = line[:-1]
            labels[label] = len(parsed_lines)
            continue

        parsed_lines.append(line)

    # Второй проход: выполнение
    ip = 0
    while 0 <= ip < len(parsed_lines) and not stopped:
        line = parsed_lines[ip].strip()
        parts = line.split()
        opcode = parts[0]

        # === Работа с регистрами и памятью ===
        if opcode == 'MOV':
            reg = parts[1]
            if parts[2] in data_labels:
                registers[reg] = data_labels[parts[2]]
            else:
                registers[reg] = int(parts[2])

        elif opcode == 'ADD':
            reg = parts[1]
            if parts[2] in data_labels:
                registers[reg] += data_labels[parts[2]]
            else:
                registers[reg] += int(parts[2])

        elif opcode == 'SUB':
            reg = parts[1]
            if parts[2] in data_labels:
                registers[reg] -= data_labels[parts[2]]
            else:
                registers[reg] -= int(parts[2])

        elif opcode == 'INC':
            registers[parts[1]] += 1

        elif opcode == 'DEC':
            registers[parts[1]] -= 1

        elif opcode == 'CMP':
            reg = parts[1]
            val = int(parts[2]) if parts[2] not in data_labels else data_labels[parts[2]]
            registers['ZF'] = 1 if registers[reg] == val else 0

        # === Стек и подпрограммы ===
        elif opcode == 'PUSH':
            reg = parts[1]
            stack.append(registers[reg])

        elif opcode == 'POP':
            if not stack:
                return {'success': False, 'error': 'Стек пуст!'}
            reg = parts[1]
            registers[reg] = stack.pop()

        elif opcode == 'CALL':
            label = parts[1]
            if label not in labels:
                return {'success': False, 'error': f'Метка {label} не найдена'}
            stack.append(ip + 1)
            ip = labels[label]
            continue

        elif opcode == 'RET':
            if not stack:
                return {'success': False, 'error': 'Стек пуст, некуда возвращаться'}
            ip = stack.pop()
            continue

        # === Переходы ===
        elif opcode == 'JMP':
            label = parts[1]
            if label not in labels:
                return {'success': False, 'error': f'Метка {label} не найдена'}
            ip = labels[label]
            continue

        elif opcode == 'JZ':
            if registers.get('ZF', 0) == 1:
                label = parts[1]
                if label not in labels:
                    return {'success': False, 'error': f'Метка {label} не найдена'}
                ip = labels[label]
                continue

        elif opcode == 'JNZ':
            if registers.get('ZF', 0) == 0:
                label = parts[1]
                if label not in labels:
                    return {'success': False, 'error': f'Метка {label} не найдена'}
                ip = labels[label]
                continue

        # === Команды дрона ===
        elif opcode == 'STEP':
            d = registers['DIR']
            nx, ny = x, y
            if d == 0: nx = x + 1
            elif d == 1: ny = y - 1
            elif d == 2: nx = x - 1
            elif d == 3: ny = y + 1
            else:
                return {'success': False, 'error': f'Неверное направление DIR={d}'}
            if 0 <= nx < puzzle.grid_width and 0 <= ny < puzzle.grid_height:
                x, y = nx, ny
            else:
                return {'success': False, 'error': 'Дрон врезался в стену!'}

        elif opcode == 'SENSE':
            registers['AX'] = 1 if [x, y] in broken else 0

        elif opcode == 'FIX':
            if [x, y] in broken:
                broken.remove([x, y])
                registers['AX'] = 0
            else:
                return {'success': False, 'error': 'Нечего чинить!'}

        elif opcode == 'COLLECT':
            if [x, y] in items:
                items.remove([x, y])
                collected.append([x, y])
            else:
                return {'success': False, 'error': 'Нечего собирать!'}

        elif opcode == 'HLT':
            stopped = True
            break

        else:
            return {'success': False, 'error': f'Неизвестная инструкция: {opcode}'}

        ip += 1
        steps += 1

    if not stopped:
        return {'success': False, 'error': 'Программа не завершилась HLT'}
    if x != puzzle.finish_x or y != puzzle.finish_y:
        return {'success': False, 'error': 'Дрон не на финише'}
    if len(collected) != len(json.loads(puzzle.items) if puzzle.items else []):
        return {'success': False, 'error': 'Не все предметы собраны'}
    return {'success': True, 'steps': steps}