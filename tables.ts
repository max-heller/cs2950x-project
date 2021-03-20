class IndependentTable<Cols> {
    columns: (keyof Cols)[];
    rows: Map<number, Cols>;

    constructor(cols: (keyof Cols)[], rows: Map<number, Cols>) {
        this.columns = cols;
        this.rows = rows;
    }

    get(id: number): Row<Cols & { id: number }> | undefined {
        const row = this.rows.get(id);
        if (row === undefined) {
            return undefined;
        }
        return new Row(["id", ...this.columns], { id: id, ...row });
    }

    filter(by: Partial<Cols>) {
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
        const rows = [];
        for (const [id, row] of this.rows) {
            rows.push({ id: id, ...row });
        }
        console.table(rows, ["id", ...this.columns.map(col => col as string)]);
    }
}


class BasicTable<Cols> {
    columns: (keyof Cols)[];
    rows: Cols[];

    constructor(cols: (keyof Cols)[], rows: Cols[]) {
        this.columns = cols;
        this.rows = rows;
    }

    get(row: number): Row<Cols> {
        return new Row(this.columns, this.rows[row]);
    }

    filter(by: Partial<Cols>) {
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

    empty() {
        return new BasicTable(this.columns, []);
    }

    print() {
        console.table(this.rows, this.columns.map(col => col as string));
    }
}

class Row<Cols> {
    columns: (keyof Cols)[];
    values: Cols;

    constructor(columns: (keyof Cols)[], values: Cols) {
        this.columns = columns;
        this.values = values;
    }
}

// A RawTable is a BasicTable or an IndependentTable
type RawTable<T> = BasicTable<T> | IndependentTable<T>
// Given a RawTable, gets the type of a data row
type Schema<T extends RawTable<any>> = (T extends BasicTable<infer X> ? X : (T extends IndependentTable<infer X> ? X : never));
// Given a RawTable, gets the types of all of the columns
type ColsOf<T extends RawTable<any>> = keyof Schema<T>
// Given a RawTable and a Column of T, gets tye type of that column
type ColType<T extends RawTable<any>, C extends ColsOf<T>> = Schema<T>[C];

type UnionToIntersection<U> =
    (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never

type NoUnion<Key> =
    // If this is a simple type UnionToIntersection<Key> will be the same type, otherwise it will an intersection of all types in the union and probably will not extend `Key`
    [Key] extends [UnionToIntersection<Key>] ? Key : never;

export class Table<IndRow, DepTables extends { [_: string]: BasicTable<any> }> {
    independentTable: IndependentTable<IndRow>;
    dependentTables: DepTables;

    static new<Row>(cols: (keyof Row)[], data: Row[]) {
        const rows = new Map();
        for (const [index, row] of data.entries()) {
            rows.set(index, row);
        }
        return new Table(new IndependentTable(cols, rows), {});
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
            return table.empty() as DepTables[K];
        }
    }

    queryValue<L extends keyof DepTables, C extends ColsOf<DepTables[L]>>(label: L, whereInd: Partial<IndRow>, col: C, whereDep: Partial<Schema<DepTables[L]>>): ColType<DepTables[L], C> {
        const table = this.query(label, whereInd).filter(whereDep);
        const first = table.get(0);
        return first.values[col];
    }

    pivotLonger<Cols extends keyof IndRow, Name extends string, Value extends Exclude<string, Name>, Header extends string>(
        cols: Cols[], namesTo: NoUnion<Name>, valuesTo: NoUnion<Value>, header: NoUnion<Exclude<Header, keyof DepTables>>
    ) {
        const newInd = this.independentTable.removeCols(cols);
        const depRows = [];
        for (const [id, row] of this.independentTable.rows) {
            for (const col of cols) {
                const name = { [namesTo]: col as string } as Record<Name, string>;
                const value = { [valuesTo]: row[col] } as Record<Value, IndRow[Cols]>;
                depRows.push({ ind_id: id, ...name, ...value });
            }
        }
        const newDep = new BasicTable(["ind_id", namesTo, valuesTo], depRows);

        const newDeps = { [header]: newDep } as Record<Header, typeof newDep>;
        return new Table(newInd, { ...this.dependentTables, ...newDeps });
    }

    setDependentVar<Variable extends keyof IndRow>(variable: NoUnion<Variable>) {
        const newInd = this.independentTable.removeCols([variable]);
        const depRows = [];
        for (const [id, row] of this.independentTable.rows) {
            const value = { [variable]: row[variable] } as Record<Variable, IndRow[NoUnion<Variable>]>;
            depRows.push({ ind_id: id, ...value });
        }
        const newDep = new BasicTable(["ind_id", variable], depRows);

        const newDeps = { [variable]: newDep } as Record<Variable, typeof newDep>;
        return new Table(newInd, { ...this.dependentTables, ...newDeps });
    }

    pivotWider<Name extends keyof Omit<IndRow, keyof { [K in keyof IndRow as (IndRow[K] extends string ? never : K)]: IndRow[K] }>, DepVars extends { [K in keyof DepTables]: keyof Omit<Schema<DepTables[K]>, "ind_id"> }>(
        namesFrom: Name, dependentVars: DepVars
    ): Table<Omit<IndRow, Name>, { [K in keyof DepTables]: BasicTable<Omit<Schema<DepTables[K]>, DepVars[K]> & Record<IndRow[Name] & string, Schema<DepTables[K]>[DepVars[K]]>> }> {
        const oldInd = this.independentTable;
        const newInd = this.independentTable.removeCols([namesFrom]);
        const indRows = [...newInd.rows.entries()];
        const idMap: Map<number, number> = new Map();
        const distinctIndRows = indRows.filter(([id, row], idx) => {
            const matching = indRows.findIndex(([_, other]) => newInd.columns.every(k => row[k] === other[k]));
            idMap.set(id, indRows[matching][0]);
            return matching === idx;
        });
        const newIndRows = new Map();
        for (const [id, row] of distinctIndRows) {
            newIndRows.set(id, row);
        }
        const dedupedNewInd = new IndependentTable(newInd.columns, newIndRows);

        type NewVars = IndRow[Name] & string;
        const distinctVals: NewVars[] = [];
        for (const [_, row] of this.independentTable.rows) {
            const x = row[namesFrom];
            if (typeof x === "string") {
                if (!distinctVals.includes(x)) {
                    distinctVals.push(x);
                }
            } else {
                throw new Error(`Cannot pivotWider on non-string value '${x}'`);
            }
        }

        function pivotWider<T extends { ind_id: number }, DepVar extends keyof T>(table: BasicTable<T>, depVar: DepVar): BasicTable<Omit<T, DepVar> & Record<NewVars, T[DepVar]>> {
            type NewCols = Record<NewVars, T[DepVar]>;
            type Row = Omit<T, DepVar> & NewCols;
            const cols = table.columns.filter(col => col !== depVar) as Exclude<keyof T, DepVar>[];

            const partialRows: [Omit<T, DepVar>, Partial<NewCols>][] = [];
            for (let row of table.rows) {
                const indRow = oldInd.rows.get(row.ind_id);
                if (indRow === undefined) {
                    throw new Error(`Invalid ind_id: '${row.ind_id}'`);
                }
                const col = indRow[namesFrom];
                if (typeof col !== "string") {
                    throw new Error(`ERROR: '${col}'`);
                }
                row = { ...row };
                const mappedId = idMap.get(row.ind_id);
                if (mappedId === undefined) {
                    throw new Error(`Unmapped ind_id: '${row.ind_id}'`);
                }
                row.ind_id = mappedId;
                const matching = partialRows.find(([existing, _]) => cols.every(col => row[col] === existing[col]));
                if (matching === undefined) {
                    const existing = { ...row };
                    delete existing[depVar];
                    const partial = {} as Partial<NewCols>;
                    partial[col] = row[depVar];
                    partialRows.push([existing, partial]);
                } else {
                    const [_, partial] = matching;
                    if (partial[col] === undefined) {
                        partial[col] = row[depVar];
                    } else {
                        throw new Error(`Duplicate`);
                    }
                }
            }

            const rows: Row[] = [];
            for (const [independent, dependent] of partialRows) {
                rows.push({ ...independent, ...dependent as Row });
            }
            return new BasicTable([...cols, ...distinctVals], rows);
        }

        type NewDepTables = { [K in keyof DepTables]: BasicTable<Omit<Schema<DepTables[K]>, DepVars[K]> & Record<NewVars, Schema<DepTables[K]>[DepVars[K]]>> };
        const newDepTables: Partial<NewDepTables> = {};
        for (const header in this.dependentTables) {
            newDepTables[header] = pivotWider(this.dependentTables[header], dependentVars[header]);
        }

        return new Table(dedupedNewInd, newDepTables as NewDepTables)
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
