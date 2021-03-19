import { createReadStream } from 'fs';
import * as parse from 'csv-parse';

class IndependentTable<Cols extends Object> {
    columns: (keyof Cols)[];
    rows: Map<number, Cols>;

    constructor(cols: (keyof Cols)[], rows: Map<number, Cols>) {
        this.columns = cols;
        this.rows = rows;
    }

    get(id: number): Row<Cols & { id: number }> {
        return new Row(["id", ...this.columns], { ...this.rows.get(id), "id": id });
    }

    filter(by: { [K in keyof Cols]?: Cols[K] }) {
        const rows = new Map();
        for (const [id, row] of this.rows) {
            let matches = true;
            for (const k in by) {
                if (row[k] !== by[k]) {
                    matches = false;
                    break;
                }
            }
            if (matches) {
                rows.set(id, row);
            }
        }
        return new IndependentTable(this.columns, rows);
    }

    print() {
        console.table([...this.rows.values()], this.columns.map(col => col as string));
    }
}


class BasicTable<Cols extends Object> {
    columns: (keyof Cols)[];
    rows: Cols[];

    constructor(cols: (keyof Cols)[], rows: Cols[]) {
        this.columns = cols;
        this.rows = rows;
    }

    get(row: number): Row<Cols> {
        return new Row(this.columns, this.rows[row]);
    }

    filter(by: { [K in keyof Cols]?: Cols[K] }) {
        const rows = this.rows.filter(row => {
            for (const k in by) {
                if (row[k] !== by[k]) {
                    return false;
                }
            }
            return true;
        });
        return new BasicTable(this.columns, rows);
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

type Parsers<T> = { [K in keyof T]: (_: any) => T[K] };

class Table<IndRow, DepTables extends { [_: string]: BasicTable<{ ind_id: number }> }> {
    independentTable: IndependentTable<IndRow>;
    dependentTables: DepTables;

    static new<Row>(cols: (keyof Row)[], data: Row[]) {
        const rows = new Map();
        for (const [index, row] of data.entries()) {
            rows.set(index, row);
        }
        return new Table(new IndependentTable(cols, rows), {});
    }

    static async fromCsv<Row>(filename: string, parsers: Parsers<Row>): Promise<Table<Row, {}>> {
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

    constructor(independentTable: IndependentTable<IndRow>, dependentTables: DepTables) {
        this.independentTable = independentTable;
        this.dependentTables = dependentTables;
    }

    query<K extends keyof DepTables>(key: K, where: IndRow): DepTables[K] {
        const table: DepTables[K] = this.dependentTables[key];
        const id = this.independentTable.filter(where).rows.keys().next();
        if (id.done === false) {
            return table.filter({ ind_id: id.value }) as DepTables[K];
        } else {
            return new BasicTable(table.columns, []) as DepTables[K];
        }
    }

    pivotLonger<Cols extends keyof IndRow, Name extends string, Value extends Exclude<string, Name>>(cols: Cols[], namesTo: Exclude<Name, keyof DepTables>, valuesTo: Value) {
        const newIndCols = this.independentTable.columns.filter(col => {
            return !cols.find(exclude => exclude === col);
        }) as Exclude<keyof IndRow, Cols>[];
        const newIndRows: Map<number, Omit<IndRow, Cols>> = new Map();
        for (const [id, row] of this.independentTable.rows) {
            const newRow: Partial<Omit<IndRow, Cols>> = {};
            newIndCols.forEach(col => newRow[col] = row[col]);
            newIndRows.set(id, newRow as Omit<IndRow, Cols>);
        }
        const newInd = new IndependentTable(newIndCols, newIndRows);

        const depRows: ({ ind_id: number } & { [_ in Name]: string } & { [_ in Value]: IndRow[Cols] })[] = [];
        for (const [id, row] of this.independentTable.rows) {
            for (const col of cols) {
                const name = { [namesTo]: col as string } as { [_ in Name]: string };
                const value = { [valuesTo]: row[col] } as { [_ in Value]: IndRow[Cols] };
                depRows.push({ ind_id: id, ...name, ...value });
            }
        }
        const newDep = new BasicTable(["ind_id", namesTo, valuesTo], depRows);

        const newDeps = { [namesTo]: newDep } as { [_ in Name]: typeof newDep };
        return new Table(newInd, { ...this.dependentTables, ...newDeps });
    }

    setDependentVar<Variable extends keyof IndRow>(variable: Variable) {
        const newIndCols = this.independentTable.columns.filter(col => col !== variable) as Exclude<keyof IndRow, Variable>[];
        const newIndRows: Map<number, Omit<IndRow, Variable>> = new Map();
        for (const [id, row] of this.independentTable.rows) {
            const newRow: Partial<Omit<IndRow, Variable>> = {};
            newIndCols.forEach(col => newRow[col] = row[col]);
            newIndRows.set(id, newRow as Omit<IndRow, Variable>);
        }
        const newInd = new IndependentTable(newIndCols, newIndRows);

        const depRows: ({ ind_id: number } & { [_ in Variable]: IndRow[Variable] })[] = [];
        for (const [id, row] of this.independentTable.rows) {
            const value = { [variable]: row[variable] } as { [_ in Variable]: IndRow[Variable] };
            depRows.push({ ind_id: id, ...value });
        }
        const newDep = new BasicTable(["ind_id", variable], depRows);

        const newDeps = { [variable]: newDep } as { [_ in Variable]: typeof newDep };
        return new Table(newInd, { ...this.dependentTables, ...newDeps });
    }


    pivotWider<Name extends keyof IndRow>(namesFrom: Name)
        : Table<Omit<IndRow, Name>, { [K in keyof DepTables]: BasicTable<any> }> {
        return undefined;
    }

    print() {
        console.log("Independent table:");
        this.independentTable.print();
        for (const key in this.dependentTables) {
            console.log(`Dependent table '${key}':`);
            this.dependentTables[key].print();
        }
    }
}

const foo = Table.new(["x", "A", "B"], [{ "x": 7, "A": 1, "B": 2 } as const, { "x": 5, "A": 3, "B": 4 } as const]);
foo.print();
const bar = foo.pivotLonger(["A", "B"], "assignment", "score");
console.log();
bar.print();
const foobar = bar.pivotWider("x");
// const baz = bar.pivotLonger(["y"], "lab", "score");
console.log();
// baz.print();
const a = "hello";
const b = "world";
const c = `${a} ${b}` as const;

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
    const thomasLabGrades = pivotTest.query("lab", { "section": 2018, "student": "tdv" });
    thomasLabGrades.print();
});
