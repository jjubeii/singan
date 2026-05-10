def check_program(program_text, puzzle, broken_cells):
    # Парсим команды
    commands = program_text.strip().splitlines()
    pc = 0  # счётчик команд
    x, y = puzzle.start_x, puzzle.start_y
    err_flag = 0
    labels = {}

    # Первый проход – собираем метки
    for i, line in enumerate(commands):
        line = line.strip()
        if line.endswith(':'):
            labels[line[:-1]] = i + 1  # метка указывает на следующую строку

    while 0 <= pc < len(commands):
        line = commands[pc].strip()
        if line.endswith(':'):
            pc += 1
            continue
        parts = line.split()
        opcode = parts[0]
        if opcode == 'MOV':
            dx = int(parts[1])
            dy = int(parts[2])
            # Если дрон сломан, MOV игнорируется
            if err_flag:
                pc += 1
                continue
            # Проверяем, не выходит ли за границы
            new_x = x + dx
            new_y = y + dy
            if 0 <= new_x < puzzle.grid_width and 0 <= new_y < puzzle.grid_height:
                x, y = new_x, new_y
            else:
                return {'success': False, 'error': 'Дрон врезался в стену!'}
            # Проверяем, не попали ли на сломанную клетку
            if [x, y] in broken_cells:
                err_flag = 1
        elif opcode == 'SNSR':
            err_flag = 1 if [x, y] in broken_cells else 0
        elif opcode == 'JFIX':
            label = parts[1]
            if err_flag:
                pc = labels.get(label, pc)
                err_flag = 0  # починили
            else:
                pc += 1
            continue
        elif opcode == 'JMP':
            label = parts[1]
            pc = labels.get(label, pc)
            continue
        elif opcode == 'HLT':
            break
        pc += 1

    if x == puzzle.finish_x and y == puzzle.finish_y:
        return {'success': True}
    else:
        return {'success': False, 'error': 'Дрон не достиг финиша'}



