import { Table } from "./tables"
import { table } from "./examples/tests_and_labs"

const foo = Table.new(
    ["year", "month", "yeehaw", "element", "d1", "d2", "e1", "e2", "f"],
    [
        { year: 2020, month: 1, yeehaw: "a", element: "tmax", d1: 1, d2: 2, e1: "a", e2: "b", f: "s" } as const,
        { year: 2020, month: 1, yeehaw: "a", element: "tmin", d1: 3, d2: 4, e1: "c", e2: "d", f: "t" } as const,
        { year: 2020, month: 1, yeehaw: "b", element: "tmax", d1: 5, d2: 6, e1: "e", e2: "f", f: "u" } as const,
        { year: 2020, month: 1, yeehaw: "b", element: "tmin", d1: 7, d2: 8, e1: "g", e2: "h", f: "v"} as const,
        { year: 2020, month: 2, yeehaw: "a", element: "tmax", d1: 9, d2: 10, e1: "i", e2: "j", f: "w" } as const,
        { year: 2020, month: 2, yeehaw: "a", element: "tmin", d1: 11, d2: 12, e1: "k", e2: "l", f: "x" } as const,
        { year: 2020, month: 2, yeehaw: "b", element: "tmax", d1: 13, d2: 14, e1: "m", e2: "n", f: "y" } as const,
        { year: 2020, month: 2, yeehaw: "b", element: "tmin", d1: 15, d2: 16, e1: "o", e2: "p", f: "z"} as const,
    ]
);

const bar = foo.pivotLonger(["d1", "d2"], "dName", "dValue", "D");
const baz = bar.pivotLonger(["e1", "e2"], "eName", "eValue", "E");
const foobar = baz.setDependentVar("f");
const barbaz = foobar.pivotWider("element");
const foobaz = barbaz.pivotWider("yeehaw")
const foobarbaz = foobaz.filter("D", (table) => table.filter({ dName: "d2" }).getCol("dValue-tmax-a")[0] === 10);
foobarbaz.print();

// const foo = Table.new(
//     ["year", "month", "element", "d1", "d2"],
//     [
//         { year: 2020, month: 1, element: "tmin", d1: 1, d2: 2 } as const,
//         { year: 2020, month: 1, element: "tmax", d1: 5, d2: 6 } as const,
//         { year: 2020, month: 2, element: "tmin", d1: 9, d2: 10 } as const,
//         { year: 2020, month: 2, element: "tmax", d1: 13, d2: 14 } as const,
//     ]
// );

// foo.print();
// const bar = foo.pivotLonger(["d1", "d2"], "day", "temp", "temperature");
// const baz = bar.pivotWider("element");
// baz.print();
// const foobarbaz = bar.pivotLonger(["e1", "e2"], "eay", "temp2", "temperature2");
// foobarbaz.print();
// const foobar = bar.pivotWider("element");
// foobar.dependentTables.temperature.rows;
// foobar.print();
// const d1tmax = foobar.queryValue("temperature", { "year": 2020, "month": 1 }, "temp-tmax", { "day": "d1" })
// console.log(d1tmax);
// const barbaz = foobar.pivotWider("yeehaw");
// const lol = barbaz.queryValue("temperature", { "year": 2020, "month": 1 }, "temp-tmax-a", { "day": "d1" });
// const lol2: number = lol;
// barbaz.print();


// table.print();
// const pivotLab = table.pivotLonger(["lab1", "lab2", "lab3", "lab4", "lab5"], "lab", "score", "lab");
// const pivotTest = pivotLab.pivotLonger(["test1", "test2", "test3", "test4", "test5"], "test", "score", "test");
// pivotTest.print();
// const thomasLabGrades = pivotTest.query("lab", { "section": 2018, "student": "tdv" });
// thomasLabGrades.print();
// // lab3 does not autofill
// const thomasLab1Grade = pivotTest.queryValue("lab", { "section": 2017, "student": "jmcclel" }, "score", { "lab": "lab3" });
// console.log(thomasLab1Grade);

// const got100 = pivotTest.filter("test", (table) => table.getCol("score").includes(100))
// got100.print();
// const got100dep = got100.dependentTables.test;

// const t = Table.new(
//     ["year", "month", "tmp"],
//     [
//         { year: 2020, month: 1,   tmp: 2 } as const,
//         { year: 2020, month: 2,   tmp: 6 } as const,
//         { year: 2020, month: 3,   tmp: 10 } as const,
//         { year: 2020, month: 4,   tmp: 14 } as const,
//     ]
// );
// t.setDependentVar("tmp").print();