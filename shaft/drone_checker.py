import json

REGISTERS = {'AX': 0, 'BX': 0, 'CX': 0, 'DX': 0, 'DIR': 0}

def run_program(program_text, puzzle):
    # Загрузка данных
    broken = json.loads(puzzle.broken_cells)
    items = json.loads(puzzle.items) if puzzle.items else []
    collected = []
    x, y = puzzle.start_x, puzzle.start_y
    stopped = False
    steps = 0
    lines = program_text.strip().splitlines()

    # Сбор меток
    labels = {}
    for i, line in enumerate(lines):
        line = line.strip()
        if line.endswith(':'):
            labels[line[:-1]] = i + 1

    ip = 0
    while 0 <= ip < len(lines) and not stopped:
        line = lines[ip].strip()
        if line == '' or line.endswith(':'):
            ip += 1
            continue
        # Убираем запятые из токенов
        parts = [token.rstrip(',') for token in line.split()]
        opcode = parts[0]
        if opcode == 'MOV':
            reg = parts[1]
            val = int(parts[2])
            REGISTERS[reg] = val
        elif opcode == 'ADD':
            reg = parts[1]; val = int(parts[2])
            REGISTERS[reg] += val
        elif opcode == 'SUB':
            reg = parts[1]; val = int(parts[2])
            REGISTERS[reg] -= val
        elif opcode == 'INC':
            REGISTERS[parts[1]] += 1
        elif opcode == 'DEC':
            REGISTERS[parts[1]] -= 1
        elif opcode == 'CMP':
            reg = parts[1]; val = int(parts[2])
            REGISTERS['ZF'] = 1 if REGISTERS[reg] == val else 0
        elif opcode == 'JMP':
            ip = labels.get(parts[1], ip)
            continue
        elif opcode == 'JZ':
            if REGISTERS.get('ZF', 0) == 1:
                ip = labels.get(parts[1], ip)
                continue
        elif opcode == 'JNZ':
            if REGISTERS.get('ZF', 0) == 0:
                ip = labels.get(parts[1], ip)
                continue
        elif opcode == 'STEP':
            # Направление из регистра DIR: 0-вправо, 1-вверх, 2-влево, 3-вниз
            d = REGISTERS['DIR']
            if d == 0: nx, ny = x+1, y
            elif d == 1: nx, ny = x, y-1
            elif d == 2: nx, ny = x-1, y
            elif d == 3: nx, ny = x, y+1
            else: return {'success': False, 'error': 'Неверное направление'}
            if 0 <= nx < puzzle.grid_width and 0 <= ny < puzzle.grid_height:
                x, y = nx, ny
            else:
                return {'success': False, 'error': 'Дрон врезался в стену!'}
        elif opcode == 'SENSE':
            # Запись в AX: 1 если сломана, 0 иначе
            REGISTERS['AX'] = 1 if [x, y] in broken else 0
        elif opcode == 'FIX':
            if [x, y] in broken:
                broken.remove([x, y])
                REGISTERS['AX'] = 0
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

    # Проверка финиша и сбора предметов
    if not stopped:
        return {'success': False, 'error': 'Программа не завершилась HLT'}
    if x != puzzle.finish_x or y != puzzle.finish_y:
        return {'success': False, 'error': 'Дрон не на финише'}
    if len(collected) != len(json.loads(puzzle.items) if puzzle.items else []):
        return {'success': False, 'error': 'Не все предметы собраны'}
    return {'success': True, 'steps': steps}