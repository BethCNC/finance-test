# finance-test

## Figma integration

This repo includes a small Node-based utility to export rich Figma file details into `figma-export/` for use alongside the Figma MCP server.

### Setup
1. Copy `.env.example` to `.env` and fill in your token and defaults:

```bash
cp .env.example .env
# Edit .env and set FIGMA_PERSONAL_ACCESS_TOKEN and optionally FIGMA_FILE_KEY
```

2. Install dependencies:

```bash
npm install
```

### Usage
- Export file, styles, components, variables, and comments:

```bash
npm run figma:fetch -- --fileKey <FILE_KEY>
```

- Also export specific node IDs (comma-separated):

```bash
npm run figma:fetch:nodes -- --fileKey <FILE_KEY> --ids 1:2,3:4
```

If `FIGMA_FILE_KEY` is set in `.env`, you can omit `--fileKey`.

Artifacts will be written to `figma-export/` as JSON files.

### Notes
- The script uses the REST API (`https://api.figma.com/v1`).
- Variables endpoint may be restricted depending on your Figma plan; errors are captured into the JSON file.
- Intended to complement the Figma MCP server by providing fuller file context and artifacts you can diff and inspect locally.
