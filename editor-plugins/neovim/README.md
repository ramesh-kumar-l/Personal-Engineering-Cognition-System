# PECS Neovim Plugin

Connects Neovim to the [PECS Desktop App](../../desktop/) via its local REST API.

## Requirements

- PECS Desktop app running (`~/.pecs/api-token` must exist)
- `curl` available in `$PATH`
- Neovim 0.9+

## Installation

**lazy.nvim:**
```lua
{
  dir = '/path/to/Personal-Engineering-Cognition-System/editor-plugins/neovim',
  config = function()
    require('pecs').setup({
      port = 39457,                    -- optional, matches PECS Desktop default
      default_workspace = 'my-project', -- optional, defaults to cwd basename
    })
  end,
}
```

**Manual:**
```lua
-- In init.lua
vim.opt.runtimepath:append('/path/to/editor-plugins/neovim')
require('pecs').setup()
```

## Commands

| Command | Description |
|---------|-------------|
| `:PecsRecord` | Interactively record an engineering memory |
| `:PecsSearch` | Search memories — results in a floating window |
| `:PecsStatus` | Show PECS Desktop version, memory count, uptime |

## How it works

1. Reads `~/.pecs/api-token` for authentication
2. Calls `http://127.0.0.1:39457/api/v1/...` via `curl`
3. Shows results inline — no background processes, no Lua HTTP library required

## Keymaps (optional)

```lua
vim.keymap.set('n', '<leader>pr', ':PecsRecord<CR>', { desc = 'PECS: Record memory' })
vim.keymap.set('n', '<leader>ps', ':PecsSearch<CR>', { desc = 'PECS: Search memories' })
```
