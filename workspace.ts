import { Table } from "./tables"
import { table } from "./examples/tests_and_labs"

table.print();
const pivotLab = table.pivotLonger(["lab1", "lab2", "lab3", "lab4", "lab5"], "lab", "score", "lab");
const pivotTest = pivotLab.pivotLonger(["test1", "test2", "test3", "test4", "test5"], "test", "score", "test");
pivotTest.print();
const thomasLabGrades = pivotTest.query("lab", { "section": 2018, "student": "tdv" });
thomasLabGrades.print();