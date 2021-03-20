
import { Table } from "../tables"

export const table = Table.new(
    ['section', 'student', 'test1', 'test2', 'test3', 'test4', 'test5', 'lab1', 'lab2', 'lab3', 'lab4', 'lab5'],
    [
        {'section': 2018, 'student': 'tdv', 'test1': 100, 'test2': 100, 'test3': 100, 'test4': 100, 'test5': 100, 'lab1': 'A', 'lab2': 'A', 'lab3': 'B', 'lab4': 'C', 'lab5': 'B'} as const,
        {'section': 2018, 'student': 'max', 'test1': 0, 'test2': 0, 'test3': 30, 'test4': 60, 'test5': 70, 'lab1': 'B', 'lab2': 'A', 'lab3': 'C', 'lab4': 'C', 'lab5': 'A'} as const,
        {'section': 2017, 'student': 'jmcclel', 'test1': 80, 'test2': 90, 'test3': 80, 'test4': 100, 'test5': 70, 'lab1': 'A', 'lab2': 'B', 'lab3': 'B', 'lab4': 'A', 'lab5': 'C'} as const,
    ]
);


