import { Table } from "./tables"
import { table } from "./examples/tests_and_labs"

const foo = Table.new(
    ["year", "month", "element", "d1", "d2"],
    [
        { year: 2020, month: 1, element: "tmax", d1: 19, d2: 50 } as const,
        { year: 2020, month: 1, element: "tmin", d1: 10, d2: 20 } as const,
        { year: 2020, month: 2, element: "tmax", d1: 5, d2: 11 } as const,
        { year: 2020, month: 2, element: "tmin", d1: 0, d2: 9 } as const,
    ]
);
foo.print();
const bar = foo.pivotLonger(["d1", "d2"], "day", "temp", "temperature");
bar.print();
const foobar = bar.pivotWider("element", { "temperature": "temp" });
foobar.dependentTables.temperature.rows;
foobar.print();
const d1tmax = foobar.queryValue("temperature", {"year": 2020, "month": 1}, "tmax", {"day": "d1"})
console.log(d1tmax);


table.print();
const pivotLab = table.pivotLonger(["lab1", "lab2", "lab3", "lab4", "lab5"], "lab", "score", "lab");
const pivotTest = pivotLab.pivotLonger(["test1", "test2", "test3", "test4", "test5"], "test", "score", "test");
pivotTest.print();
const thomasLabGrades = pivotTest.query("lab", { "section": 2018, "student": "tdv" });
thomasLabGrades.print();
// lab3 does not autofill
const thomasLab1Grade = pivotTest.queryValue("lab", { "section": 2017, "student": "jmcclel" }, "score", {"lab": "lab3"});
console.log(thomasLab1Grade);
const got100 = pivotTest.filter("test", (table) => {
    for (const row of table.rows) {
        if (row.score === 100) {
            return true;
        }
    }
    return false;
})
got100.print();
const got100dep = got100.dependentTables.test;