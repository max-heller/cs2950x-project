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
        console.log(this.columns.join(", "));
        for (const row of this) {
            new Row(this.columns, row).print();
        }
    }
}

class Row<Cols extends Object> {
    columns: (keyof Cols)[];
    values: Cols;

    constructor(columns: (keyof Cols)[], values: Cols) {
        this.columns = columns;
        this.values = values;
    }

    print() {
        console.log(this.columns.map(col => this.values[col]).join(", "));
    }
}

class Table<IndRow> {
    independentTable: BasicTable<IndRow>;
    dependentTables: BasicTable<any>[];

    static new<Row>(cols: (keyof Row)[], data: Row[]) {
        const rows: (Row & { id: number })[] = [];
        for (const [index, row] of data.entries()) {
            rows.push({ "id": index, ...row });
        }
        return new Table(new BasicTable(["id", ...cols], rows), []);
    }

    constructor(independentTable: BasicTable<IndRow>, dependentTables: BasicTable<Object>[]) {
        this.independentTable = independentTable;
        this.dependentTables = dependentTables;
    }

    pivotLonger<Cols extends Exclude<keyof IndRow, "id">>(cols: Cols[], namesTo: string, valuesTo: string): Table<Omit<IndRow, Cols>> {
        const newIndCols = this.independentTable.columns.filter(col => {
            return !cols.find(exclude => exclude === col);
        }) as Exclude<keyof IndRow, Cols>[];
        const newIndRows = this.independentTable.rows.map(row => {
            const newRow: Partial<Omit<IndRow, Cols>> = {};
            newIndCols.forEach(col => newRow[col] = row[col]);
            return newRow as Omit<IndRow, Cols>;
        });
        const newInd = new BasicTable(newIndCols, newIndRows);

        const depRows: Object[] = [];
        for (const row of this.independentTable) {
            for (const col of cols) {
                depRows.push({ id: row["id"], [namesTo]: col, [valuesTo]: row[col] });
            }
        }
        const newDep = new BasicTable<any>(["id", namesTo, valuesTo], depRows);

        return new Table(newInd, [...this.dependentTables, newDep]);
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
bar.print();
const baz = bar.pivotLonger(["y"], "lab", "score");
baz.print();