#!/usr/bin/env bash
# Bootstrap deterministic anti-slop MCP tooling for Cursor (project-local).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TOOLS="$ROOT/.tools"
VENV="$TOOLS/venv"
UX="$TOOLS/ux-skill"

mkdir -p "$TOOLS"

if [[ ! -d "$UX/.git" ]]; then
  git clone --depth 1 https://github.com/Laith0003/ux-skill.git "$UX"
else
  git -C "$UX" pull --ff-only || true
fi

if [[ ! -x "$VENV/bin/python" ]]; then
  python3 -m venv "$VENV"
fi

"$VENV/bin/pip" install --upgrade pip
"$VENV/bin/pip" install "$UX[mcp]" 'mcp>=1.0,<2'

# ux-skill's pyproject allows mcp 2.x, which breaks Server.list_tools(); pin 1.x.
"$VENV/bin/python" - <<'PY'
from mcp.server import Server
assert hasattr(Server("t"), "list_tools"), "Need mcp<2 for ux-mcp"
print("ux-mcp runtime OK")
PY

mkdir -p "$ROOT/.cursor"
cat > "$ROOT/.cursor/mcp.json" <<EOF
{
  "mcpServers": {
    "ux-skill": {
      "command": "$VENV/bin/ux-mcp",
      "args": []
    },
    "ai-slop-checker": {
      "command": "npx",
      "args": ["-y", "github:parweb/mcp-ai-slop-checker"]
    }
  }
}
EOF

echo "Wrote $ROOT/.cursor/mcp.json"
echo "Optional design skills: npx -y impeccable@3.6.0 install --providers=cursor --scope=project -y"
echo "Reload Cursor MCP servers, then use tools from ux-skill + ai-slop-checker."
