[![make.fun bounty](https://img.shields.io/badge/make.fun-bounty-red)](https://make.fun/bounty/news-image-20261125)
[![make.fun site](https://img.shields.io/badge/make.fun-site-blue)](https://make.fun)
[![make.fun entry](https://img.shields.io/badge/make.fun-news--image--20261125-green)](https://github.com/toannhu/makefun-news-image-20261125)

# makefun-news-image-20261125

An entry for the [make.fun](https://make.fun) news image bounty
([news-image-20261125](https://make.fun/bounty/news-image-20261125)).

![Entry poster](entry.png)

## What it does

The entry is a pre-rendered 1024×1024 news poster, `entry.png`. The script
`main.ts` copies it into the output directory and checks the copy:

1. It works out the output directory from `MAKEFUN_OUTPUT_DIR`, or uses
   `/output` if that is unset or blank.
2. It creates that directory, including any missing parent directories.
3. It reads `entry.png` from the script's own directory (`import.meta.dirname`),
   so the current working directory doesn't matter, and checks that it is a PNG.
4. It writes the file to `<output dir>/entry.png`.
5. It reads the written file back from disk and checks it (see
   [Output contract](#output-contract)).
6. If the write or any check fails, it deletes the output file and exits with
   code 1.

The run is deterministic. There is no network access, randomness or
timestamps, and the output is a byte-for-byte copy of `entry.png`. The script
has no dependencies beyond Node's built-in `node:fs` and `node:path`.

## How to run

You need Node.js 22.6 or later, which supports TypeScript type stripping.

```sh
# Write to the default location (/output)
node --experimental-strip-types main.ts

# Write to a custom directory
MAKEFUN_OUTPUT_DIR=./out node --experimental-strip-types main.ts
```

From Node 23.6 onward, type stripping is on by default, so `node main.ts` also
works.

There is no install step, no `package.json` and no build.

## Output contract

| Item           | Value                                                    |
| -------------- | -------------------------------------------------------- |
| Directory      | `$MAKEFUN_OUTPUT_DIR`, or `/output` if unset or blank    |
| File           | `entry.png`                                              |
| Format         | PNG, 1024×1024                                           |
| Size           | Greater than 0 and at most 1 MiB (1,048,576 bytes)       |
| Signature      | First 8 bytes are `89 50 4E 47 0D 0A 1A 0A`              |
| Content        | Byte-for-byte identical to the `entry.png` in this repo  |

The script checks size, signature and byte count after writing, by reading the
file back from disk.

**Exit codes**

- `0`: the file was written and passed all checks. One line goes to stdout:
  ```
  OK: /output/entry.png — <bytes> bytes, PNG signature valid, matches source
  ```
- `1`: something failed. One `ERROR: …` line goes to stderr, naming the file
  and the reason. If the failure happened after writing started, the output
  file has been removed, so the directory never holds a partial or invalid
  `entry.png`.

## Repository layout

```
.
├── entry.png   # the poster (1024×1024 PNG)
├── main.ts     # copies entry.png to the output directory and verifies it
└── README.md
```
