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

    clone() {
        const data = [];
        for (const row of this.rows) {
            data.push({ ...row });
        }
        return new BasicTable(this.columns, data);
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

class Table<IndRow, IndVars extends keyof IndRow> {
    independentTable: BasicTable<IndRow>;
    dependentTables: BasicTable<any>[];

    static new<Row>(cols: (keyof Row)[], data: Row[]) {
        const rows = [];
        for (const [index, row] of data.entries()) {
            rows.push({ "id": index, ...row });
        }
        return new Table(new BasicTable<Row & { id: number }>(["id", ...cols], rows), []);
    }

    constructor(independentTable: BasicTable<IndRow>, dependentTables: BasicTable<Object>[]) {
        this.independentTable = independentTable;
        this.dependentTables = dependentTables;
    }

    pivotLonger<Cols extends Exclude<IndVars, "id">>(cols: Cols[], namesTo: string, valuesTo: string): Table<Omit<IndRow, Cols>, Exclude<IndVars, Cols>> {
        const newInd = this.independentTable.clone();
        for (const row of newInd) {
            for (const col of cols) {
                delete row[col];
            }
        }

        const dep: Object[] = [];
        for (const row of this.independentTable) {
            for (const col of cols) {
                const newRow = { "id": row["id"], [namesTo]: col, [valuesTo]: row[col] };
                dep.push(newRow);
            }
        }
        const newDep = this.dependentTables.map(table => table.clone());
        newDep.push(new BasicTable<any>(["id", namesTo, valuesTo], dep));

        return new Table(newInd as unknown as BasicTable<Omit<IndRow, Cols>>, newDep); // oops
    }

    print() {
        console.log("Independent table:");
        this.independentTable.print();
        for ((index, table) of this.this.dependentTables.entries()) {

        }
    }
}

const foo = Table.new(["x", "y", "A", "B"], [{ "x": 7, "y": 8, "A": 1, "B": 2 }, { "x": 5, "y": 6, "A": 3, "B": 4 }]);
const bar = foo.pivotLonger(["A", "B"], "foo", "bar");
// x.print();

// class Table2<Row extends Object> {
//     columns: (keyof Row)[];
//     data: Row[];

//     // independentVars: (keyof Row)[], dependentVars: (keyof Row)[][]
//     constructor(data: Row[]) {
//         this.columns = Object.keys(data[0]) as (keyof Row)[];
//         this.data = data;
//     }

//     print() {
//         console.log("Print table:");
//         for (const row of this.data) {
//             console.log(row);
//         }
//         console.log("End print table.")
//     }
// }

// const y = new Table2([{ "A": 1, "B": 2 }, { "A": 3, "B": 4, "C": 5 }]);
// y.print();