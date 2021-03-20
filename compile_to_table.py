import sys
import csv

def try_parse(value):
    try:
        return int(value)
    except ValueError:
        try:
            return float(value)
        except ValueError:
            return value

def compile(in_loc, out_loc):
    with open(in_loc, "r") as f:
        all_data = list(csv.reader(f))
    
    headers = all_data[0]
    data = [[try_parse(value) for value in row] for row in all_data[1:]]

    print(headers)
    print(data)

    table = []
    for data_row in data:
        row = {}
        for header, value in zip(headers, data_row):
            row[header] = value
        table.append(row)

    newline = "\n"

    output = f"""
import {{ Table }} from "./tables"

export const table = Table.new(
    {headers},
    [
{newline.join(["        " + str(row) + " as const," for row in table])}
    ]
);
"""
    with open(out_loc, "w") as f:
        f.write(output)

if __name__ == "__main__":
    compile(sys.argv[1], sys.argv[2])