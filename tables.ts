import { createReadStream } from 'fs';
import * as parse from 'csv-parse';

class BasicTable<Cols extends Object> {
    columns: (keyof Cols)[];
    rows: Cols[];

    constructor(cols: (keyof Cols)[], rows: Cols[]) {
        this.columns = cols;
        this.rows = rows;
    }

    [Symbol.iterator]() { return this.rows.values() }

    get(row: number): Row<Cols> {
        return new Row(this.columns, this.rows[row]);
    }

    print() {
        console.table(this.rows, this.columns.map(col => col as string));
    }
}

class Row<Cols extends Object> {
    columns: (keyof Cols)[];
    values: Cols;

    constructor(columns: (keyof Cols)[], values: Cols) {
        this.columns = columns;
        this.values = values;
    }
}

type Parsers<T> = { [K in keyof T]: (v: any) => T[K] };

class Table<IndRow extends { id: number }, DepTables extends BasicTable<any>[]> {
    independentTable: BasicTable<IndRow>;
    dependentTables: DepTables;

    static new<Row>(cols: (keyof Row)[], data: Row[]) {
        const rows: (Row & { id: number })[] = [];
        for (const [index, row] of data.entries()) {
            rows.push({ "id": index, ...row });
        }
        return new Table(new BasicTable(["id", ...cols], rows));
    }

    static async fromCsv<Row>(filename: string, parsers: Parsers<Row>): Promise<Table<Row & { id: number }, []>> {
        const rows: any[][] = [];
        return new Promise((resolve, reject) => {
            createReadStream(filename)
                .pipe(parse())
                .on('data', (row: any) => {
                    rows.push(row);
                })
                .on('end', () => {
                    const cols = rows[0].map(String) as (keyof Row)[];
                    const data: Row[] = [];
                    for (const row of rows.slice(1)) {
                        const rowObj: Partial<Row> = {};
                        for (const [idx, val] of row.entries()) {
                            const col = cols[idx];
                            rowObj[col] = parsers[col](val);
                        }
                        data.push(rowObj as Row);
                    }
                    resolve(Table.new(cols, data));
                })
                .on('error', reject)
        })
    }

    constructor(independentTable: BasicTable<IndRow>, ...dependentTables: DepTables) {
        this.independentTable = independentTable;
        this.dependentTables = dependentTables;
    }

    pivotLonger<Cols extends Exclude<keyof IndRow, "id">, Name extends string, Value extends string>(cols: Cols[], namesTo: Name, valuesTo: Value) {
        const newIndCols = this.independentTable.columns.filter(col => {
            return !cols.find(exclude => exclude === col);
        }) as Exclude<keyof IndRow, Cols>[];
        const newIndRows = this.independentTable.rows.map(row => {
            const newRow: Partial<Omit<IndRow, Cols>> = {};
            newIndCols.forEach(col => newRow[col] = row[col]);
            return newRow as Omit<IndRow, Cols> & { id: number };
        });
        const newInd = new BasicTable(newIndCols, newIndRows);

        const depRows: ({ id: number } & { [name in Name]: string } & { [value in Value]: IndRow[Cols] })[] = [];
        for (const row of this.independentTable) {
            for (const col of cols) {
                const name = { [namesTo]: col as string } as { [name in Name]: string };
                const value = { [valuesTo]: row[col] } as { [value in Value]: IndRow[Cols] };
                depRows.push({ id: row["id"], ...name, ...value });
            }
        }
        const newDep = new BasicTable(["id", namesTo, valuesTo], depRows);

        return new Table(newInd, ...this.dependentTables, newDep);
    }

    print() {
        console.log("Independent table:");
        this.independentTable.print();
        for (const [index, table] of this.dependentTables.entries()) {
            console.log(`Dependent table ${index}:`);
            table.print();
        }
    }
}

const foo = Table.new(["x", "y", "A", "B"], [{ "x": 7, "y": 8, "A": 1, "B": 2 }, { "x": 5, "y": 6, "A": 3, "B": 4 }]);
foo.print();
const bar = foo.pivotLonger(["A", "B"], "assignment", "score");
console.log();
bar.print();
const baz = bar.pivotLonger(["y"], "lab", "score");
console.log();
baz.print();

const parsers = {
    section: Number,
    student: String,
    test1: Number,
    test2: Number,
    test3: Number,
    test4: Number,
    test5: Number,
    lab1: String,
    lab2: String,
    lab3: String,
    lab4: String,
    lab5: String
};
Table.fromCsv("tests_and_labs.csv", parsers).then((testsAndLabs) => {
    const pivotLab = testsAndLabs.pivotLonger(["lab1", "lab2", "lab3", "lab4", "lab5"], "lab", "score");
    const pivotTest = pivotLab.pivotLonger(["test1", "test2", "test3", "test4", "test5"], "test", "score");
    pivotTest.print();
});
