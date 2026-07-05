import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const checks = [
  requireCommand(["node"], ["--version"], { required: true }),
  requireCommand(["npm"], ["--version"], { required: true }),
  requireCommand(["cargo", join(homedir(), ".cargo/bin/cargo")], ["--version"], {
    required: false,
    hint: "Install Rust before running native Tauri compile/package checks."
  }),
  requireFile("src-tauri/tauri.conf.json"),
  requireFile("src-tauri/Cargo.toml"),
  requireFile("index.html"),
  requireFile("src/main.tsx")
];

let failed = false;

for (const check of checks) {
  if (check.ok) {
    console.log(`ok ${check.label}${check.detail ? ` ${check.detail}` : ""}`);
    continue;
  }

  if (check.required) {
    failed = true;
    console.error(`error ${check.label}: ${check.message}`);
  } else {
    console.warn(`warn ${check.label}: ${check.message}`);
  }
}

if (failed) {
  process.exitCode = 1;
}

function requireCommand(commands, args, options) {
  for (const command of commands) {
    const result = spawnSync(command, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });

    if (result.status === 0) {
      const output = (result.stdout ?? "").trim() || (result.stderr ?? "").trim();
      return {
        label: commands[0],
        ok: true,
        required: options.required,
        detail: output,
        message: ""
      };
    }
  }

  return {
    label: commands[0],
    ok: false,
    required: options.required,
    detail: "",
    message: options.hint ?? "command not available"
  };
}

function requireFile(path) {
  return {
    label: path,
    ok: existsSync(path),
    required: true,
    message: "required project file is missing"
  };
}
