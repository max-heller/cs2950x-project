import { Table } from "./tables"
import { table } from "./examples/tests_and_labs"

const foo = Table.new(
    ["year", "month", "element", "t1", "t2", "h1", "h2", "avg"],
    [
        { year: 2020, month: 1, element: "max", t1: 1, t2: 2, h1: "high", h2: "low", avg: 1.5 } as const,
        { year: 2020, month: 1, element: "min", t1: 3, t2: 4, h1: "high", h2: "med", avg: 3.5 } as const,
        { year: 2020, month: 2, element: "max", t1: 9, t2: 10, h1: "very high", h2: "very high", avg: 9.5 } as const,
        { year: 2020, month: 2, element: "min", t1: 11, t2: 12, h1: "low", h2: "low", avg: 11.5} as const,
        { year: 2020, month: 3, element: "max", t1: 1, t2: 2, h1: "low", h2: "med", avg: 1.5 } as const,
        { year: 2020, month: 3, element: "min", t1: 3, t2: 4, h1: "med", h2: "med", avg: 3.5 } as const,
    ]
);

const cleaned = foo
    .pivotLonger(["t1", "t2"], "day", "temp", "temperature")
    .pivotLonger(["h1", "h2"], "day", "humidity", "humidity")
    .setDependentVar("avg")
    .pivotWider("element");
cleaned.print();
const foobarbaz = cleaned.filter("temperature", table => table.queryValue("temp-max", { day: "t2" }) === 10);
foobarbaz.print();

// const foo = Table.new(
//     ["year", "month", "element", "d1", "t2"],
//     [
//         { year: 2020, month: 1, element: "tmin", d1: 1, d2: 2 } as const,
//         { year: 2020, month: 1, element: "tmax", d1: 5, d2: 6 } as const,
//         { year: 2020, month: 2, element: "tmin", d1: 9, d2: 10 } as const,
//         { year: 2020, month: 2, element: "tmax", d1: 13, d2: 14 } as const,
//     ]
// );

// foo.print();
// const bar = foo.pivotLonger(["d1", "t2"], "day", "temp", "temperature");
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