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

    removeCols<Remove extends keyof Cols>(cols: Remove[]): IndependentTable<Omit<Cols, Remove>> {
        const newIndCols = this.columns.filter(col => {
            return !cols.find(exclude => exclude === col);
        }) as Exclude<keyof Cols, Remove>[];
        const newIndRows: Map<number, Omit<Cols, Remove>> = new Map();
        for (const [id, row] of this.rows) {
            const newRow: Partial<Omit<Cols, Remove>> = {};
            newIndCols.forEach(col => newRow[col] = row[col]);
            newIndRows.set(id, newRow as Omit<Cols, Remove>);
        }
        return new IndependentTable(newIndCols, newIndRows);
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

type Schema<T> = (T extends BasicTable<infer X> ? X : (T extends IndependentTable<infer X> ? X : never));

type UnionToIntersection<U> =
    (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never

type NoUnion<Key> =
    // If this is a simple type UnionToIntersection<Key> will be the same type, otherwise it will an intersection of all types in the union and probably will not extend `Key`
    [Key] extends [UnionToIntersection<Key>] ? Key : never;

class Table<IndRow, DepTables extends { [_: string]: BasicTable<any> }> {
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

    query<K extends keyof DepTables>(key: K, where: Partial<IndRow>): DepTables[K] {
        const table: DepTables[K] = this.dependentTables[key];
        const id = this.independentTable.filter(where).rows.keys().next();
        if (id.done === false) {
            return table.filter({ ind_id: id.value }) as DepTables[K];
        } else {
            return new BasicTable(table.columns, []) as DepTables[K];
        }
    }

    pivotLonger<Cols extends keyof IndRow, Name extends string, Value extends Exclude<string, Name>, Header extends string>(
        cols: Cols[], namesTo: NoUnion<Name>, valuesTo: NoUnion<Value>, header: NoUnion<Exclude<Header, keyof DepTables>>
    ) {
        const newInd = this.independentTable.removeCols(cols);
        const depRows: ({ ind_id: number } & { [_ in Name]: string } & { [_ in Value]: IndRow[Cols] })[] = [];
        for (const [id, row] of this.independentTable.rows) {
            for (const col of cols) {
                const name = { [namesTo]: col as string } as { [_ in Name]: string };
                const value = { [valuesTo]: row[col] } as { [_ in Value]: IndRow[Cols] };
                depRows.push({ ind_id: id, ...name, ...value });
            }
        }
        const newDep = new BasicTable(["ind_id", namesTo, valuesTo], depRows);

        const newDeps = { [header]: newDep } as { [_ in Header]: typeof newDep };
        return new Table(newInd, { ...this.dependentTables, ...newDeps });
    }

    setDependentVar<Variable extends keyof IndRow>(variable: NoUnion<Variable>) {
        const newInd = this.independentTable.removeCols([variable]);
        const depRows: ({ ind_id: number } & { [_ in Variable]: IndRow[Variable] })[] = [];
        for (const [id, row] of this.independentTable.rows) {
            const value = { [variable]: row[variable] } as { [_ in Variable]: IndRow[NoUnion<Variable>] };
            depRows.push({ ind_id: id, ...value });
        }
        const newDep = new BasicTable(["ind_id", variable], depRows);

        const newDeps = { [variable]: newDep } as { [_ in Variable]: typeof newDep };
        return new Table(newInd, { ...this.dependentTables, ...newDeps });
    }

    pivotWider<Name extends keyof IndRow>(namesFrom: Name)
        : Table<Omit<IndRow, Name>, { [K in keyof DepTables]: BasicTable<Schema<DepTables[K]> & { [_ in IndRow[Name] & string]: number }> }> {
        const newInd = this.independentTable.removeCols([namesFrom]);
        // TODO: actually pivot
        return new Table(newInd, this.dependentTables)
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

const foo = Table.new(["x", "A"], [{ "x": "foo", "A": 1 } as const, { "x": "bar", "A": 3 } as const]);
foo.print();
const bar = foo.pivotLonger(["A"], "assignment", "score", "foobar");
console.log();
bar.print();
const foobar = bar.pivotWider("x");
type t = typeof foobar.dependentTables;
const baz = bar.pivotLonger(["x"], "lab", "score", "barbaz");
console.log();
// baz.print();
const a = "hello";
const b = "world";
const c = `${a} ${b}` as const;
const d = baz.dependentTables["foobar"];
const e = bar.independentTable;
type foo = Schema<typeof e>["x"];

const parsers = {
    section: Number,
    student: String,
    test1: Number,
    test2: Number,
    lab1: String,
    lab2: String,
};
Table.fromCsv("tests_and_labs.csv", parsers).then((testsAndLabs) => {
    const pivotLab = testsAndLabs.pivotLonger(["lab1", "lab2"], "lab", "score", "lab");
    const pivotTest = pivotLab.pivotLonger(["test1", "test2"], "test", "score", "test");
    pivotTest.print();
    const thomasLabGrades = pivotTest.query("lab", { "section": 2018, "student": "tdv" });
    thomasLabGrades.print();
});
