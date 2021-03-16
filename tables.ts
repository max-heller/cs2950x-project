class Table<Row, IndVars extends ((keyof Row) & string)> {
    columns: (keyof Row)[];
    independent_table: (Pick<Row, IndVars> & { "id": number })[];
    dependent_tables: Partial<Omit<Row, IndVars>>[][];

    static new<Row, IndVars extends keyof Row>(cols: (keyof Row)[], data: Row[]) {
        const columns = cols;
        const independent_table = [];
        for (const [id, row] of data.entries()) {
            independent_table.push({ ...row, "id": id });
        }
        return new Table(cols, independent_table, []);
    }

    constructor(cols: (keyof Row)[], independent_table: (Pick<Row, IndVars> & { "id": number })[], dependent_tables: Partial<Omit<Row, IndVars>>[][]) {
        this.columns = cols;
        this.independent_table = independent_table;
        this.dependent_tables = dependent_tables;
    }

    pivotLonger<Cols extends IndVars, Name extends Object, Value>(cols: Cols[], names_to: Name, values_to: Value) {
        const newInd = [...this.independent_table];
        for (const row of newInd) {
            for (const col of cols) {
                delete row[col];
            }
        }

        type ValueType = (Pick<Row, IndVars> & { "id": number })[Cols];
        const dep: {
            "id": number, names_to: string, values_to: ValueType
        }[] = [];
        for (const row of this.independent_table) {
            for (const col of cols) {
                const newRow = { "id": row["id"], names_to: col, values_to: row[col] };
                //       (Pick<Row, IndVars> & { "id": number })[Cols]
                // Type '(Pick<Row, IndVars> & { id: number; })[Cols]' is not assignable to type 'ValueType'
                dep.push(newRow);
            }
        }
        const newDep: Partial<Omit<Row, IndVars> & { Name: string, Value: ValueType }>[][] = [...this.dependent_tables];
        newDep.push(dep);

        return new Table(cols, newInd, newDep)
    }

    // print() {
    //     console.log("Print table:");
    //     for (const row of this) {
    //         console.log(row);
    //     }
    //     console.log("End print table.")
    // }
}

const foo = Table.new(["A", "B"], [{ "A": 1, "B": 2 }, { "A": 3, "B": 4 }]);
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