import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const positional = [];
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith("--")) {
      positional.push(token);
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith("--")) {
      options[key] = true;
      continue;
    }

    options[key] = next;
    index += 1;
  }

  return { positional, options };
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value);
    rows.push(row);
  }

  if (rows.length > 0 && rows.at(-1)?.length === 1 && rows.at(-1)?.[0] === "") {
    rows.pop();
  }

  return rows;
}

function normalizeKey(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function cleanHeader(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function toInt(value) {
  const normalized = normalizeKey(value);

  if (!normalized || normalized === "-") {
    return null;
  }

  const plain = normalized.replace(/,/g, "");
  const number = Number.parseInt(plain, 10);
  return Number.isNaN(number) ? null : number;
}

function toPercent(value) {
  const normalized = normalizeKey(value);

  if (!normalized || normalized === "-") {
    return null;
  }

  const plain = normalized.replace(/%/g, "");
  const number = Number.parseFloat(plain);
  return Number.isNaN(number) ? null : number;
}

function readCsv(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const rows = parseCsv(text);

  if (rows.length === 0) {
    throw new Error(`CSV kosong: ${filePath}`);
  }

  const rawHeader = rows[0];
  const header = rawHeader.map(cleanHeader);
  const headerEntries = header
    .map((name, index) => ({ name, index }))
    .filter((entry) => entry.name);
  const records = rows.slice(1).map((cells, index) => {
    const record = {};
    for (const entry of headerEntries) {
      record[entry.name] = cells[entry.index] ?? "";
    }

    return {
      line: index + 2,
      cells,
      record,
    };
  });

  return { filePath, rawHeader, header, headerEntries, records };
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (!/[",\n]/.test(text)) {
    return text;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(rows, columns) {
  const lines = [columns.map(csvEscape).join(",")];
  for (const row of rows) {
    lines.push(columns.map((column) => csvEscape(row[column])).join(","));
  }
  return `${lines.join("\n")}\n`;
}

function issueRow(issue) {
  return {
    severity: issue.severity,
    type: issue.type,
    file: path.basename(issue.file),
    line: issue.line,
    date: issue.date ?? "",
    part: issue.part ?? "",
    machine: issue.machine ?? "",
    detail: issue.detail ?? "",
  };
}

function getMasterMachineNumbers(row, namedColumnCount) {
  const machineNumbers = new Set();
  const primaryMachine = String(row.record["MACHINE NO"] ?? "").trim();

  if (primaryMachine) {
    machineNumbers.add(primaryMachine);
  }

  for (const cell of row.cells.slice(namedColumnCount)) {
    const value = String(cell ?? "").trim();
    if (value) {
      machineNumbers.add(value);
    }
  }

  return [...machineNumbers];
}

function analyze(masterCsv, productionCsv) {
  const issues = [];
  const masterMap = new Map();
  const masterDuplicateMap = new Map();

  for (const row of masterCsv.records) {
    const id = normalizeKey(row.record.ID);
    if (!id) {
      continue;
    }

    const existing = masterMap.get(id) ?? [];
    existing.push(row);
    masterMap.set(id, existing);
    masterDuplicateMap.set(id, (masterDuplicateMap.get(id) ?? 0) + 1);

    const extraPopulated = row.cells
      .slice(masterCsv.headerEntries.length)
      .map((cell) => String(cell ?? "").trim())
      .filter(Boolean);

    row.machineNumbers = getMasterMachineNumbers(row, masterCsv.headerEntries.length);

    if (extraPopulated.length > 0) {
      issues.push({
        severity: "warning",
        type: "MASTER_EXTRA_COLUMNS",
        file: masterCsv.filePath,
        line: row.line,
        part: row.record.ID,
        detail: `Kolom tambahan terisi: ${extraPopulated.join(", ")}`,
      });
    }
  }

  for (const [id, count] of masterDuplicateMap) {
    if (count > 1) {
      for (const row of masterMap.get(id) ?? []) {
        issues.push({
          severity: "warning",
          type: "MASTER_DUPLICATE_ID",
          file: masterCsv.filePath,
          line: row.line,
          part: row.record.ID,
          machine: row.record["MACHINE NO"],
          detail: `ID master duplikat setelah trim/normalisasi: ${id}`,
        });
      }
    }
  }

  for (const row of productionCsv.records) {
    const part = row.record["NAMA PART"];
    const normalizedPart = normalizeKey(part);
    const category = row.record.KATEGORY;
    const normalizedCategory = normalizeKey(category);
    const machine = row.record["NO MESIN"];
    const normalizedMachine = normalizeKey(machine);
    const output = toInt(row.record["TOTAL OUTPUT (PCS)"]);
    const ok = toInt(row.record["TOTAL OK (PCS)"]);
    const ng = toInt(row.record["TOTAL NG (PCS)"]);
    const yieldProcess = toPercent(row.record["YIELD PROSES (%)"]);
    const yieldNg = toPercent(row.record["YIELD NG (%)"]);
    const date = row.record.DATE;
    const matches = normalizedPart ? (masterMap.get(normalizedPart) ?? []) : [];

    if (!normalizedPart) {
      issues.push({
        severity: "error",
        type: "PROD_BLANK_PART",
        file: productionCsv.filePath,
        line: row.line,
        date,
        machine,
        detail: "Nama part kosong",
      });
    }

    if (normalizedCategory === "#N/A") {
      issues.push({
        severity: "error",
        type: "PROD_CATEGORY_ERROR",
        file: productionCsv.filePath,
        line: row.line,
        date,
        part,
        machine,
        detail: "Kategori bernilai #N/A",
      });
    }

    if (
      normalizeKey(row.record["YIELD PROSES (%)"]) === "#DIV/0!" ||
      normalizeKey(row.record["YIELD NG (%)"]) === "#DIV/0!"
    ) {
      issues.push({
        severity: "error",
        type: "PROD_DIV_ZERO",
        file: productionCsv.filePath,
        line: row.line,
        date,
        part,
        machine,
        detail: "Yield mengandung #DIV/0!",
      });
    }

    if (normalizedPart && matches.length === 0) {
      issues.push({
        severity: "error",
        type: "PROD_MISSING_IN_MASTER",
        file: productionCsv.filePath,
        line: row.line,
        date,
        part,
        machine,
        detail: "Part tidak ditemukan di master",
      });
    }

    if (matches.length > 0) {
      const categoryMatches = matches.some(
        (match) => normalizeKey(match.record.KATEGORY) === normalizedCategory,
      );
      const machineMatches = matches.some((match) =>
        match.machineNumbers.some(
          (machineNumber) => normalizeKey(machineNumber) === normalizedMachine,
        ),
      );

      if (!categoryMatches) {
        issues.push({
          severity: "error",
          type: "PROD_CATEGORY_MISMATCH",
          file: productionCsv.filePath,
          line: row.line,
          date,
          part,
          machine,
          detail: `Kategori master: ${[
            ...new Set(matches.map((match) => match.record.KATEGORY)),
          ].join(", ")}`,
        });
      }

      if (!machineMatches) {
        issues.push({
          severity: "error",
          type: "PROD_MACHINE_MISMATCH",
          file: productionCsv.filePath,
          line: row.line,
          date,
          part,
          machine,
          detail: `Mesin master: ${[
            ...new Set(matches.flatMap((match) => match.machineNumbers)),
          ].join(", ")}`,
        });
      }
    }

    if (output !== null && ok !== null && ng !== null && output !== ok + ng) {
      issues.push({
        severity: "error",
        type: "PROD_TOTAL_MISMATCH",
        file: productionCsv.filePath,
        line: row.line,
        date,
        part,
        machine,
        detail: `Output=${output}, OK=${ok}, NG=${ng}`,
      });
    }

    if (output !== null && output > 0 && ok !== null && yieldProcess !== null) {
      const computed = Math.round((ok / output) * 100);
      if (Math.abs(computed - yieldProcess) > 0.1) {
        issues.push({
          severity: "warning",
          type: "PROD_YIELD_PROCESS_MISMATCH",
          file: productionCsv.filePath,
          line: row.line,
          date,
          part,
          machine,
          detail: `Yield proses file=${yieldProcess}%, hitung=${computed}%`,
        });
      }
    }

    if (output !== null && output > 0 && ng !== null && yieldNg !== null) {
      const computed = Math.round((ng / output) * 100);
      if (Math.abs(computed - yieldNg) > 0.1) {
        issues.push({
          severity: "warning",
          type: "PROD_YIELD_NG_MISMATCH",
          file: productionCsv.filePath,
          line: row.line,
          date,
          part,
          machine,
          detail: `Yield NG file=${yieldNg}%, hitung=${computed}%`,
        });
      }
    }
  }

  const issueCounts = [
    ...issues
      .reduce((map, issue) => {
        map.set(issue.type, (map.get(issue.type) ?? 0) + 1);
        return map;
      }, new Map())
      .entries(),
  ]
    .sort((left, right) => right[1] - left[1])
    .map(([type, count]) => ({ type, count }));

  return {
    summary: {
      productionRows: productionCsv.records.length,
      masterRows: masterCsv.records.length,
      issueCount: issues.length,
      errorCount: issues.filter((issue) => issue.severity === "error").length,
      warningCount: issues.filter((issue) => issue.severity === "warning").length,
    },
    issues,
    issueCounts,
  };
}

function renderMarkdown({ productionPath, masterPath, analysis }) {
  const lines = [];
  const grouped = analysis.issues.reduce((map, issue) => {
    const key = issue.type;
    const bucket = map.get(key) ?? [];
    bucket.push(issue);
    map.set(key, bucket);
    return map;
  }, new Map());

  lines.push("# CSV Validation Report");
  lines.push("");
  lines.push(`- Production: \`${productionPath}\``);
  lines.push(`- Master: \`${masterPath}\``);
  lines.push(`- Production rows: ${analysis.summary.productionRows}`);
  lines.push(`- Master rows: ${analysis.summary.masterRows}`);
  lines.push(`- Errors: ${analysis.summary.errorCount}`);
  lines.push(`- Warnings: ${analysis.summary.warningCount}`);
  lines.push("");
  lines.push("## Issue Counts");
  lines.push("");

  for (const item of analysis.issueCounts) {
    lines.push(`- ${item.type}: ${item.count}`);
  }

  lines.push("");
  lines.push("## Exact Rows To Fix");
  lines.push("");

  for (const [type, items] of grouped) {
    lines.push(`### ${type}`);
    lines.push("");
    lines.push("| Line | Date | Part | Machine | Detail |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const issue of items) {
      lines.push(
        `| ${issue.line} | ${issue.date ?? ""} | ${issue.part ?? ""} | ${issue.machine ?? ""} | ${String(issue.detail ?? "").replace(/\|/g, "\\|")} |`,
      );
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function main() {
  const { positional, options } = parseArgs(process.argv.slice(2));
  const [productionPath, masterPath] = positional;

  if (!productionPath || !masterPath) {
    console.error(
      "Usage: node scripts/validate-production-csv.mjs <production.csv> <master.csv> [--report report.md] [--issues issues.csv]",
    );
    process.exitCode = 1;
    return;
  }

  const productionCsv = readCsv(productionPath);
  const masterCsv = readCsv(masterPath);
  const analysis = analyze(masterCsv, productionCsv);

  console.log(`Production rows : ${analysis.summary.productionRows}`);
  console.log(`Master rows     : ${analysis.summary.masterRows}`);
  console.log(`Errors          : ${analysis.summary.errorCount}`);
  console.log(`Warnings        : ${analysis.summary.warningCount}`);
  console.log("");
  console.log("Issue counts:");

  for (const item of analysis.issueCounts) {
    console.log(`- ${item.type}: ${item.count}`);
  }

  if (options.report) {
    fs.writeFileSync(
      options.report,
      renderMarkdown({ productionPath, masterPath, analysis }),
      "utf8",
    );
    console.log(`\nMarkdown report : ${options.report}`);
  }

  if (options.issues) {
    const issueRows = analysis.issues.map(issueRow);
    fs.writeFileSync(
      options.issues,
      toCsv(issueRows, ["severity", "type", "file", "line", "date", "part", "machine", "detail"]),
      "utf8",
    );
    console.log(`Issues CSV      : ${options.issues}`);
  }
}

main();
