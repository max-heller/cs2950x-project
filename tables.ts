import * as utils from "./utils"

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

    getCol<K extends keyof Cols>(col: K): Cols[K][] {
        return [...this.rows.values()].map((row) => row[col]);
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

    find(by: Partial<Cols>): number | undefined {
        for (const [id, row] of this.rows) {
            let matches = true;
            for (const k in by) {
                if (row[k] !== by[k]) {
                    matches = false;
                    break;
                }
            }
            if (matches) {
                return id;
            }
        }
        return undefined;
    }

    queryValue<C extends keyof Cols>(col: C, by: Partial<Omit<Cols, C>>): Cols[C] {
        const table = this.filter(by as Partial<Cols>);
        const first = table.get(0);
        if (first === undefined) {
            throw new Error("Not found");
        }
        return first.values[col];
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

    print(id = true) {
        const rows = [];
        for (const [id, row] of this.rows) {
            rows.push({ id: id, ...row });
        }
        const cols = this.columns.map(col => col as string);
        if (id) {
            console.table(rows, ["id", ...cols]);
        } else {
            console.table(rows, cols);
        }
    }
}


class BasicTable<IndCols, DepCols> {
    indCols: (keyof IndCols)[];
    depCols: (keyof DepCols)[];
    rows: (IndCols & DepCols)[];

    constructor(indCols: (keyof IndCols)[], depCols: (keyof DepCols)[], rows: (IndCols & DepCols)[]) {
        this.indCols = indCols;
        this.depCols = depCols;
        this.rows = rows;
    }

    get(row: number): Row<IndCols & DepCols> {
        return new Row([...this.indCols, ...this.depCols], this.rows[row]);
    }

    getCol<K extends keyof (IndCols & DepCols)>(col: K): (IndCols & DepCols)[K][] {
        return this.rows.map((row) => row[col]);
    }

    filter(by: Partial<IndCols>) {
        const rows = this.rows.filter(row => {
            for (const k in by) {
                if (row[k] !== by[k]) {
                    return false;
                }
            }
            return true;
        });
        return new BasicTable(this.indCols, this.depCols, rows);
    }

    map<R extends { [K in keyof DepCols]: any }, F extends <K extends keyof DepCols>(value: DepCols[K]) => R[K]>(func: F)
        : BasicTable<IndCols, R> {
        const rows = this.rows.map(row => {
            const newRow: Partial<IndCols & R> = { ...row };

            for (const depVar of this.depCols) {
                newRow[depVar] = func(row[depVar]);
            }

            return newRow as IndCols & R;
        })

        return new BasicTable<IndCols, R>(this.indCols, this.depCols, rows);
    }

    queryValue<C extends keyof DepCols>(col: C, by: Partial<IndCols>): DepCols[C] {
        const table = this.filter(by);
        const first = table.get(0);
        if (first === undefined) {
            throw new Error("Not found");
        }
        return first.values[col];
    }

    empty() {
        return new BasicTable(this.indCols, this.depCols, []);
    }

    print() {
        console.table(this.rows, [...this.indCols, ...this.depCols].map(col => col as string));
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

type Schema<T extends IndependentTable<any>> = (T extends IndependentTable<infer X> ? X : never);
type IndSchema<T extends BasicTable<any, any>> = (T extends BasicTable<infer I, infer D> ? I : never);
type DepSchema<T extends BasicTable<any, any>> = (T extends BasicTable<infer I, infer D> ? D : never);

type ColsOf<T extends IndependentTable<any>> = keyof Schema<T>
type IndColsOf<T extends BasicTable<any, any>> = keyof IndSchema<T>
type DepColsOf<T extends BasicTable<any, any>> = keyof DepSchema<T>

type ColType<T extends IndependentTable<any>, C extends ColsOf<T>> = Schema<T>[C];
type IndColType<T extends BasicTable<any, any>, C extends IndColsOf<T>> = IndSchema<T>[C];
type DepColType<T extends BasicTable<any, any>, C extends DepColsOf<T>> = DepSchema<T>[C];

type UnionToIntersection<U> =
    (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never

type NoUnion<Key> =
    // If this is a simple type UnionToIntersection<Key> will be the same type, otherwise it will an intersection of all types in the union and probably will not extend `Key`
    [Key] extends [UnionToIntersection<Key>] ? Key : never;

type Op<Headers> =
    | { type: "depvar", variable: string }
    | { type: "longer", cols: string[], namesFrom: string, valuesFrom: string, targetTable: Headers }
    | { type: "wider", namesFrom: string, values: string[], origCols: Record<Headers & string, string[]> }
    | { type: "reduce", header: Headers, variable: string }

export class Table<IndRow, DepTables extends Record<string, BasicTable<any, any>>> {
    independentTable: IndependentTable<IndRow>;
    dependentTables: DepTables;
    ops: Op<keyof DepTables>[];
    originalCols: string[];

    static new<Row>(cols: (keyof Row & string)[], data: Row[]): Table<Row, {}> {
        const rows = new Map();
        for (const [index, row] of data.entries()) {
            rows.set(index, row);
        }
        return new Table(new IndependentTable(cols, rows), {}, [], cols);
    }

    constructor(independentTable: IndependentTable<IndRow>, dependentTables: DepTables, ops: Op<keyof DepTables>[], originalCols: string[]) {
        this.independentTable = independentTable;
        this.dependentTables = dependentTables;
        this.ops = ops;
        this.originalCols = originalCols;
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

    queryValue<L extends keyof DepTables, C extends DepColsOf<DepTables[L]>>(label: L, whereInd: Partial<IndRow>, col: C, whereDep: Partial<IndSchema<DepTables[L]>>): DepColType<DepTables[L], C> {
        const table = this.query(label, whereInd).filter(whereDep);
        const first = table.get(0);
        return first.values[col];
    }

    getObservation(whereInd: IndRow): Table<IndRow, DepTables> {
        const id = this.independentTable.find(whereInd);
        if (id === undefined) {
            throw new Error("Observation missing");
        }
        const newInd = new IndependentTable(this.independentTable.columns, new Map([[id, whereInd]]));
        const newDeps: Partial<DepTables> = {};
        for (const header in this.dependentTables) {
            newDeps[header] = this.query(header, whereInd);
        }

        return new Table(newInd, newDeps as DepTables, this.ops, this.originalCols);
    }

    filter(condition: (table: Table<IndRow, DepTables>) => boolean): Table<IndRow, DepTables> {
        const newIndRows = new Map();
        const newDepRows = utils.objMap(this.dependentTables, (_, __) => []);

        for (const [id, row] of this.independentTable.rows) {
            const currTable = this.getObservation(row);
            if (condition(currTable)) {
                newIndRows.set(id, row);
            }
        }

        const newIndTable = new IndependentTable(this.independentTable.columns, newIndRows);
        const newDepTables = utils.objMap(newDepRows, (header, depRows) => {
            const oldDepTable = this.dependentTables[header];
            return new BasicTable(oldDepTable.indCols as string[], oldDepTable.depCols as string[], depRows);
        });

        return new Table(newIndTable, newDepTables, this.ops, this.originalCols);
    }

    filterDep<L extends keyof DepTables>(label: L, condition: (table: DepTables[L]) => boolean)
        : Table<IndRow, DepTables> {
        const newIndData = utils.mapFilter(this.independentTable.rows, (_, value) => {
            const depTable = this.query(label, value);
            return condition(depTable);
        });
        const newIndTable = new IndependentTable(this.independentTable.columns, newIndData);

        const newDepTables = utils.objMap(this.dependentTables, <K extends keyof DepTables>(_: K, value: DepTables[K]) => {
            let depTableData: (IndSchema<DepTables[K]> & DepSchema<DepTables[K]>)[] = [];
            for (const [id, _] of newIndTable.rows) {
                depTableData = [...depTableData, ...value.filter({ ind_id: id }).rows];
            }
            return new BasicTable<IndSchema<DepTables[K]>, DepSchema<DepTables[K]>>(value.indCols, value.depCols, depTableData);
        });

        return new Table<IndRow, DepTables>(newIndTable, newDepTables, this.ops, this.originalCols);
    }

    map<L extends keyof DepTables, R extends { [K in DepColsOf<DepTables[L]>]: any }, F extends <K extends DepColsOf<DepTables[L]>>(value: DepColType<DepSchema<DepTables[L]>, K>) => R[K]>(
        label: L, func: F
    ) {
        const depTable = this.dependentTables[label];
        const newDepTable = depTable.map(func);
        const newDepTables: Omit<DepTables, L> & Record<L, BasicTable<IndSchema<DepTables[L]>, R>> = { ...this.dependentTables, [label]: newDepTable };
        return new Table(this.independentTable, newDepTables, this.ops as Op<L | Exclude<keyof DepTables, L>>[], this.originalCols);
    }

    buildCol<Col extends string, Out, F extends (table: Table<IndRow, DepTables>) => Out>(
        func: F, newCol: Col
    ) {
        const rows = [];
        for (const [id, row] of this.independentTable.rows) {
            const observation = this.getObservation(row);
            const result: Out = func(observation);
            rows.push({ ind_id: id, [newCol]: result } as { ind_id: number } & Record<Col, Out>);
        }

        const newDepTable = new BasicTable<{ ind_id: number }, Record<Col, Out>>([], [newCol], rows);
        const newDepTables: DepTables & Record<Col, BasicTable<{ ind_id: number }, Record<Col, Out>>> = { ...this.dependentTables, [newCol]: newDepTable };
        const newOps = [...this.ops, { type: "depvar", variable: newCol }] as Op<Col | keyof DepTables>[];
        return new Table(this.independentTable, newDepTables, newOps, [...this.originalCols, newCol]);
    }

    pivotLonger<Cols extends string & keyof IndRow, Name extends string, Value extends Exclude<string, Name>, Header extends string>(
        cols: Cols[], namesTo: NoUnion<Name>, valuesTo: NoUnion<Value>, header: NoUnion<Exclude<Header, keyof DepTables>>
    ) {
        if (new Set(cols).size !== cols.length) {
            throw new Error(`pivotLonger columns must be distinct: [${cols.join(", ")}]`)
        }
        const newInd = this.independentTable.removeCols(cols);
        const depRows = [];
        for (const [id, row] of this.independentTable.rows) {
            for (const col of cols) {
                const name = { [namesTo]: col } as Record<Name, Cols>;
                const value = { [valuesTo]: row[col] } as Record<Value, IndRow[Cols]>;
                depRows.push({ ind_id: id, ...name, ...value });
            }
        }
        const indCols: (Name | "ind_id")[] = ["ind_id", namesTo];
        const depCols: Value[] = [valuesTo];
        const newDep = new BasicTable<Record<"ind_id", number> & Record<Name, Cols>, Record<Value, IndRow[Cols]>>(indCols, depCols, depRows);

        const newDeps = { [header]: newDep } as Record<Header, typeof newDep>;
        const op: Op<keyof DepTables | Exclude<Header, keyof DepTables>> = {
            type: "longer",
            cols: cols,
            namesFrom: namesTo,
            valuesFrom: valuesTo,
            targetTable: header
        };
        return new Table(newInd, { ...this.dependentTables, ...newDeps }, [...this.ops, op], this.originalCols);
    }

    setDependentVar<Variable extends keyof IndRow & string>(variable: NoUnion<Variable>) {
        const newInd = this.independentTable.removeCols([variable]);
        const depRows = [];
        for (const [id, row] of this.independentTable.rows) {
            const value = { [variable]: row[variable] } as Record<Variable, IndRow[NoUnion<Variable>]>;
            depRows.push({ ind_id: id, ...value });
        }
        const newDep = new BasicTable<Record<"ind_id", number>, Record<Variable, IndRow[Variable]>>(["ind_id"], [variable], depRows);

        const newDeps = { [variable]: newDep } as Record<Variable, typeof newDep>;
        const op: Op<keyof DepTables | Variable> = { type: "depvar", variable: variable };
        return new Table(newInd, { ...this.dependentTables, ...newDeps }, [...this.ops, op], this.originalCols);
    }

    pivotWider<Name extends string & keyof Omit<IndRow, keyof { [K in keyof IndRow as (IndRow[K] extends string ? never : K)]: IndRow[K] }>>(
        namesFrom: Name
    ): Table<Omit<IndRow, Name>, { [K in keyof DepTables]:
        BasicTable<
            IndSchema<DepTables[K]>,
            Record<`${DepColsOf<DepTables[K]> & string}-${IndRow[Name] & string}`, DepColType<DepTables[K], DepColsOf<DepTables[K]>>>
        > }> {
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
        const dedupedNewInd: IndependentTable<Omit<IndRow, Name>> = new IndependentTable(newInd.columns, newIndRows);

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

        function pivotWider<T extends { ind_id: number }, U>(table: BasicTable<T, U>):
            BasicTable<T, Record<`${keyof U & string}-${NewVars}`, U[keyof U]>> {
            type DepVar = keyof U;
            type NewDepVars = `${DepVar & string}-${NewVars}`;
            type NewDepCols = Record<NewDepVars, U[DepVar]>;
            type Row = T & NewDepCols;

            const partialRows: [T, Partial<NewDepCols>][] = [];
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
                const matching = partialRows.find(([existing, _]) => table.indCols.every(col => row[col] === existing[col]));
                let _, partial: Partial<NewDepCols>;
                if (matching === undefined) {
                    const existing = { ...row };
                    for (const depVar of table.depCols) {
                        delete existing[depVar];
                    }
                    partial = {} as Partial<NewDepCols>;
                    partialRows.push([existing, partial]);
                } else {
                    [_, partial] = matching;
                }
                for (const depVar of table.depCols) {
                    if (typeof depVar !== "string") {
                        throw new Error(`ERROR: '${col}'`);
                    }
                    const newCol: NewDepVars = `${depVar}-${col}` as const;
                    if (partial[newCol] === undefined) {
                        partial[newCol] = row[depVar];
                    } else {
                        throw new Error(`Duplicate`);
                    }
                }
            }

            const rows: Row[] = [];
            for (const [independent, dependent] of partialRows) {
                rows.push({ ...independent, ...dependent as Row });
            }
            const depVars: NewDepVars[] = [];
            for (const depVar of table.depCols) {
                if (typeof depVar !== "string") {
                    throw new Error("ERROR");
                }
                for (const val of distinctVals) {
                    depVars.push(`${depVar}-${val}` as const);
                }
            }
            return new BasicTable(table.indCols, depVars, rows);
        }

        type NewDepTables = { [K in keyof DepTables]:
            BasicTable<
                IndSchema<DepTables[K]>,
                Record<`${DepColsOf<DepTables[K]> & string}-${NewVars}`, DepColType<DepTables[K], DepColsOf<DepTables[K]>>>
            > };
        const newDepTables: Partial<NewDepTables> = {};
        for (const header in this.dependentTables) {
            newDepTables[header] = pivotWider(this.dependentTables[header]);
        }

        const origCols: Partial<Record<keyof DepTables & string, string[]>> = {};
        for (const header in this.dependentTables) {
            const cols: string[] = [];
            for (const col of this.dependentTables[header].depCols) {
                cols.push(col as string);
            }
            origCols[header] = cols;
        }

        const op: Op<keyof NewDepTables> = { type: "wider", namesFrom: namesFrom, values: distinctVals, origCols: origCols as Record<keyof DepTables & string, string[]> };
        return new Table<Omit<IndRow, Name>, NewDepTables>(dedupedNewInd, newDepTables as NewDepTables, [...this.ops, op], this.originalCols);
    }

    print() {
        let table: Table<IndRow, DepTables> = this;
        for (const op of [...this.ops].reverse()) {
            if (op.type === "wider") {
                let id = 0;
                const newIndRows = new Map();
                for (const [_, row] of table.independentTable.rows) {
                    for (const value of op.values) {
                        const newRow = { ...row, [op.namesFrom]: value }
                        newIndRows.set(id++, newRow);
                    }
                }
                const newIndTable = new IndependentTable<IndRow>([...table.independentTable.columns, op.namesFrom as keyof IndRow], newIndRows);

                const newDepTables: Partial<DepTables> = {}
                for (const header in table.dependentTables) {
                    const origDepTable = table.dependentTables[header];
                    const origCols = op.origCols[header];
                    let newTableRows: Record<string, {}>[] = [];
                    for (const origRow of origDepTable.rows) {
                        const newRow: Partial<Record<string, any>> = {};
                        for (const indCol of origDepTable.indCols) {
                            newRow[indCol as string] = origRow[indCol];
                        }

                        const newRows = [];
                        for (const value of op.values) {
                            const fullNewRow = { ...newRow };
                            for (const origCol of op.origCols[header]) {
                                const newCol = `${origCol}-${value}`;
                                fullNewRow[origCol] = origRow[newCol];
                            }
                            const rowId: number = newIndTable.filter({ ...table.independentTable.rows.get(origRow["ind_id"]), [op.namesFrom]: value } as Partial<IndRow & Record<string, string>>).rows.keys().next().value;
                            fullNewRow["ind_id"] = rowId;
                            newRows.push(fullNewRow);
                        }

                        newTableRows = [...newTableRows, ...newRows];
                    }
                    const newDepTable = new BasicTable(origDepTable.indCols as string[], origCols, newTableRows);

                    newDepTables[header] = newDepTable as DepTables[Extract<keyof DepTables, string>];
                }

                table = new Table(newIndTable, newDepTables as DepTables, [], this.originalCols) as Table<IndRow, DepTables>;
            } else if (op.type === "depvar") {
                const v = op.variable as keyof IndRow & keyof DepTables;
                const indRows = new Map(table.independentTable.rows);
                const indTable = new IndependentTable([...table.independentTable.columns, v], indRows);
                for (const [_, row] of indRows) {
                    row[v] = table.queryValue(v, row, v, {});
                }
                const depTables = { ...table.dependentTables };
                delete depTables[v];
                table = new Table(indTable, depTables, [], this.originalCols);
            } else if (op.type === "reduce") {
                const h = op.header as keyof DepTables;
                const v = op.variable as keyof IndRow;
                const indRows = new Map(table.independentTable.rows);
                const indTable = new IndependentTable([...table.independentTable.columns, v], indRows);
                for (const [_, row] of indRows) {
                    row[v] = table.queryValue(h, row, v, {});
                }
                const depTables = { ...table.dependentTables };
                delete depTables[h];
                table = new Table(indTable, depTables, [], this.originalCols);
            } else if (op.type === "longer") {
                const cols = op.cols as (keyof IndRow)[];
                const indRows = new Map();
                const indTable = new IndependentTable([...table.independentTable.columns, ...cols], indRows);
                for (const [id, row] of table.independentTable.rows) {
                    const newRow = { ...row };
                    for (const col of cols) {
                        const where = { [op.namesFrom]: col } as Partial<IndSchema<DepTables[keyof DepTables]>>;
                        newRow[col] = table.queryValue(op.targetTable, row, op.valuesFrom, where) as IndRow[keyof IndRow];
                    }
                    indRows.set(id, newRow);
                }
                const depTables = { ...table.dependentTables };
                delete depTables[op.targetTable];
                table = new Table(indTable, depTables, [], this.originalCols);
            }
        }
        const finalTable = new IndependentTable(this.originalCols as (keyof IndRow)[], table.independentTable.rows);
        finalTable.print(false);
    }

    reduce<Accumulator, Output, NewHeader extends string, NewCol extends string>(reducer: Reducer<Table<IndRow, DepTables>, Accumulator, Output>, newHeader: NewHeader, newCol: NewCol) {
        let [acc, out]: [Accumulator | undefined, Output | undefined] = [undefined, undefined];
        type NewRow = { ind_id: number } & Record<NewCol, Output>;
        const newRows: NewRow[] = [];
        for (const [id, row] of this.independentTable.rows) {
            const currTable = this.getObservation(row);
            if (acc === undefined) {
                [acc, out] = reducer.one(currTable);
            } else {
                [acc, out] = reducer.reduce(currTable, acc);
            }
            const newRow: NewRow = {
                ind_id: id,
                [newCol]: out
            } as NewRow;
            newRows.push(newRow);
        }

        const newInd = this.independentTable;
        const newDepTable = new BasicTable<{ ind_id: number }, Record<NewCol, Output>>(["ind_id"], [newCol], newRows);
        const newDeps = { ...this.dependentTables, [newHeader]: newDepTable };
        const newOp = { type: "reduce", header: newHeader, variable: newCol } as Op<keyof DepTables | NewHeader>;
        return new Table(newInd, newDeps, [...this.ops, newOp], [...this.originalCols, newCol]);
    }

    reduceToVal<Accumulator, Output>(reducer: Reducer<Table<IndRow, DepTables>, Accumulator, Output>) {
        let [acc, out]: [Accumulator | undefined, Output | undefined] = [undefined, undefined];
        for (const [_, row] of this.independentTable.rows) {
            const currTable = this.getObservation(row);
            if (acc === undefined) {
                [acc, out] = reducer.one(currTable);
            } else {
                [acc, out] = reducer.reduce(currTable, acc);
            }
        }
        return out;
    }

    reducer<Acc, Out>(one: (table: Table<IndRow, DepTables>) => [Acc, Out], reduce: (values: Table<IndRow, DepTables>, acc: Acc) => [Acc, Out]) {
        return { one: one, reduce: reduce }
    }

    columnReducer<Header extends keyof DepTables, Col extends keyof DepSchema<DepTables[Header]>, Acc, Out>(
        header: Header, col: Col, one: (values: DepColType<DepTables[Header], Col>[]) => [Acc, Out], reduce: (values: DepColType<DepTables[Header], Col>[], acc: Acc) => [Acc, Out]
    ) {
        return {
            one: (table: Table<IndRow, DepTables>): [Acc, Out] => {
                const values = table.query(header, {}).getCol(col);
                return one(values);
            },
            reduce: (table: Table<IndRow, DepTables>, acc: Acc): [Acc, Out] => {
                const values = table.query(header, {}).getCol(col);
                return reduce(values, acc);
            },
        }
    }
}

interface Reducer<Table, Accumulator, Output> {
    one: (table: Table) => [Accumulator, Output];
    reduce: (table: Table, acc: Accumulator) => [Accumulator, Output];
}

export const runningMeanReducer = <IndRow, DepTables extends Record<string, BasicTable<any, any>>, Header extends keyof DepTables, Col extends keyof DepSchema<DepTables[Header]>>(
    table: Table<IndRow, DepTables>, header: Header, col: Col
) => {
    return table.columnReducer(header, col,
        (values => {
            const count = values.length;
            const sum = values.reduce((acc, val) => acc + val, 0);
            return [[count, sum], sum / count];
        }),
        (values, [count, sum]) => {
            const newCount = count + values.length;
            const newSum = sum + values.reduce((acc, val) => acc + val, 0);
            return [[newCount, newSum], newSum / newCount];
        })
};

export const runningSumReducer = <IndRow, DepTables extends Record<string, BasicTable<any, any>>, Header extends keyof DepTables, Col extends keyof DepSchema<DepTables[Header]>>(
    table: Table<IndRow, DepTables>, header: Header, col: Col
) => {
    return table.columnReducer(header, col,
        (values) => {
            const sum = values.reduce((acc, val) => acc + val, 0);
            return [sum, sum];
        },
        (values, sum) => {
            const newSum = sum + values.reduce((acc, val) => acc + val, 0);
            return [newSum, newSum];
        })
};