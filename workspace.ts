import { Table } from "./tables"
import { table } from "./examples/tests_and_labs"

const foo = Table.new(
    ["year", "month", "yeehaw", "element", "d1", "d2"],
    [
        { year: 2020, month: 1, yeehaw: "a", element: "tmax", d1: 1, d2: 2 } as const,
        { year: 2020, month: 1, yeehaw: "a", element: "tmin", d1: 3, d2: 4 } as const,
        { year: 2020, month: 1, yeehaw: "b", element: "tmax", d1: 5, d2: 6 } as const,
        { year: 2020, month: 1, yeehaw: "b", element: "tmin", d1: 7, d2: 8 } as const,
        { year: 2020, month: 2, yeehaw: "a", element: "tmax", d1: 9, d2: 10 } as const,
        { year: 2020, month: 2, yeehaw: "a", element: "tmin", d1: 11, d2: 12 } as const,
        { year: 2020, month: 2, yeehaw: "b", element: "tmax", d1: 13, d2: 14 } as const,
        { year: 2020, month: 2, yeehaw: "b", element: "tmin", d1: 15, d2: 16 } as const,
    ]
);
foo.print();
const bar = foo.pivotLonger(["d1", "d2"], "day", "temp", "temperature");
bar.print();
const foobar = bar.pivotWider("element");
foobar.dependentTables.temperature.rows;
foobar.print();
const d1tmax = foobar.queryValue("temperature", { "year": 2020, "month": 1 }, "temp-tmax", { "day": "d1" })
console.log(d1tmax);
const barbaz = foobar.pivotWider("yeehaw");
barbaz.print();


table.print();
const pivotLab = table.pivotLonger(["lab1", "lab2", "lab3", "lab4", "lab5"], "lab", "score", "lab");
const pivotTest = pivotLab.pivotLonger(["test1", "test2", "test3", "test4", "test5"], "test", "score", "test");
pivotTest.print();
const thomasLabGrades = pivotTest.query("lab", { "section": 2018, "student": "tdv" });
thomasLabGrades.print();
// lab3 does not autofill
const thomasLab1Grade = pivotTest.queryValue("lab", { "section": 2017, "student": "jmcclel" }, "score", { "lab": "lab3" });
console.log(thomasLab1Grade);

const got100 = pivotTest.filter("test", (table) => table.getCol("score").includes(100))
got100.print();
const got100dep = got100.dependentTables.test;