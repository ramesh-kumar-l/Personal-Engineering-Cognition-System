-- PECS Neovim Plugin
-- Connects to PECS Desktop App REST API (http://127.0.0.1:39457)
--
-- Setup:
--   require('pecs').setup({ port = 39457 })  -- in init.lua / lazy.nvim config
--
-- Commands:
--   :PecsRecord   — record an engineering memory
--   :PecsSearch   — search memories in a floating window
--   :PecsStatus   — show PECS Desktop connection status

local M = {}

local config = {
  port = 39457,
  token_path = vim.fn.expand('~/.pecs/api-token'),
  default_workspace = vim.fn.fnamemodify(vim.fn.getcwd(), ':t'),
}

-- ── Utilities ─────────────────────────────────────────────────────────────────

local function urlencode(str)
  return (str:gsub('[^%w%-%.%_%~]', function(c)
    return string.format('%%%02X', string.byte(c))
  end))
end

local function read_token()
  local f = io.open(config.token_path, 'r')
  if not f then return nil end
  local token = f:read('*a'):gsub('%s+', '')
  f:close()
  return token ~= '' and token or nil
end

local function api(method, endpoint, body)
  local token = read_token()
  if not token then
    vim.notify('[PECS] No API token found at ' .. config.token_path ..
      '. Is PECS Desktop running?', vim.log.levels.WARN)
    return nil
  end

  local url = string.format('http://127.0.0.1:%d/api/v1%s', config.port, endpoint)
  local auth_header = string.format('-H "Authorization: Bearer %s"', token)
  local body_arg = body
    and string.format("-d %s -H 'Content-Type: application/json'", vim.fn.shellescape(vim.fn.json_encode(body)))
    or ''

  local cmd = string.format(
    'curl -s --connect-timeout 2 -X %s %s %s "%s"',
    method, auth_header, body_arg, url
  )

  local raw = vim.fn.system(cmd)
  if vim.v.shell_error ~= 0 then
    vim.notify('[PECS] Request failed — is PECS Desktop running on port ' .. config.port .. '?',
      vim.log.levels.ERROR)
    return nil
  end

  local ok, data = pcall(vim.fn.json_decode, raw)
  if not ok or data == vim.NIL then return nil end
  return data
end

-- ── Commands ──────────────────────────────────────────────────────────────────

function M.record()
  local title = vim.fn.input('Memory title: ')
  if title == '' then return end
  local content = vim.fn.input('Content: ')
  if content == '' then return end
  local tags_raw = vim.fn.input('Tags (comma-separated, or enter to skip): ')
  local tags = {}
  if tags_raw ~= '' then
    for tag in tags_raw:gmatch('[^,]+') do
      table.insert(tags, vim.trim(tag))
    end
  end

  local mem_type = vim.fn.inputlist({
    'Select memory type:', '1. note', '2. decision', '3. learning', '4. debug', '5. incident',
  })
  local types = { 'note', 'decision', 'learning', 'debug', 'incident' }
  local chosen_type = types[mem_type] or 'note'

  local result = api('POST', '/memories', {
    workspaceId = config.default_workspace,
    type = chosen_type,
    title = title,
    content = content,
    tags = tags,
    filePath = vim.api.nvim_buf_get_name(0),
  })

  if result and result.id then
    vim.notify('[PECS] Memory recorded: "' .. result.title .. '"', vim.log.levels.INFO)
  end
end

function M.search()
  local query = vim.fn.input('Search memories: ')
  if query == '' then return end

  local results = api('GET', '/memories/search?q=' .. urlencode(query) ..
    '&workspace=' .. urlencode(config.default_workspace))

  if not results then return end
  if #results == 0 then
    vim.notify('[PECS] No results for "' .. query .. '"', vim.log.levels.INFO)
    return
  end

  -- Build floating window content
  local lines = {
    string.format(' PECS Search: "%s" (%d result%s) ', query, #results, #results ~= 1 and 's' or ''),
    string.rep('─', 60),
  }
  for i, r in ipairs(results) do
    local score_pct = string.format('%d%%', math.floor((r.score or 0) * 100))
    table.insert(lines, string.format('%d. [%s] %s', i, score_pct, r.title or '(no title)'))
    if r.excerpt and r.excerpt ~= '' then
      -- Wrap excerpt at ~55 chars
      local excerpt = r.excerpt:sub(1, 220)
      for _, line in ipairs(vim.split(excerpt, '\n')) do
        table.insert(lines, '   ' .. line:sub(1, 55))
      end
    end
    if r.memoryType or r.workspaceId then
      table.insert(lines, string.format('   (%s · %s)', r.memoryType or '', r.workspaceId or ''))
    end
    table.insert(lines, '')
  end

  local buf = vim.api.nvim_create_buf(false, true)
  vim.api.nvim_buf_set_lines(buf, 0, -1, false, lines)
  vim.api.nvim_buf_set_option(buf, 'modifiable', false)
  vim.api.nvim_buf_set_option(buf, 'filetype', 'markdown')

  local win_width = math.min(70, vim.o.columns - 6)
  local win_height = math.min(#lines, vim.o.lines - 6)

  vim.api.nvim_open_win(buf, true, {
    relative = 'editor',
    width = win_width,
    height = win_height,
    col = math.floor((vim.o.columns - win_width) / 2),
    row = math.floor((vim.o.lines - win_height) / 2),
    style = 'minimal',
    border = 'rounded',
  })

  -- Close on q or Escape
  for _, key in ipairs({ 'q', '<Esc>' }) do
    vim.api.nvim_buf_set_keymap(buf, 'n', key, ':close<CR>', { noremap = true, silent = true })
  end
end

function M.status()
  -- Status is public (no auth needed), so call directly
  local cmd = string.format('curl -s --connect-timeout 2 "http://127.0.0.1:%d/api/v1/status"', config.port)
  local raw = vim.fn.system(cmd)
  if vim.v.shell_error ~= 0 or raw == '' then
    vim.notify('[PECS] Cannot reach PECS Desktop on port ' .. config.port, vim.log.levels.WARN)
    return
  end
  local ok, data = pcall(vim.fn.json_decode, raw)
  if ok and data and data.version then
    vim.notify(string.format('[PECS] v%s · %d memories · uptime %ds',
      data.version, data.memoryCount or 0, data.uptime or 0), vim.log.levels.INFO)
  else
    vim.notify('[PECS] Unexpected response from PECS Desktop', vim.log.levels.WARN)
  end
end

-- ── Setup ─────────────────────────────────────────────────────────────────────

function M.setup(opts)
  if opts then
    config = vim.tbl_deep_extend('force', config, opts)
  end

  vim.api.nvim_create_user_command('PecsRecord', M.record, { desc = 'Record an engineering memory in PECS' })
  vim.api.nvim_create_user_command('PecsSearch', M.search, { desc = 'Search engineering memories in PECS' })
  vim.api.nvim_create_user_command('PecsStatus', M.status, { desc = 'Show PECS Desktop connection status' })
end

return M
