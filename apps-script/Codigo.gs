// ============================================================
// Data.FinTech API v2 - Google Apps Script (Web App)
// Banco de dados: Google Sheets (uma aba por entidade)
//
// Protocolo (o mesmo que o front React já usa):
//   GET  ?action=records.list&entity=Transaction&query={...}&sort=-due_date&limit=25&cursor=0&access_token=...
//   POST { "action": "records.create", "entity": "Account", "values": {...}, "access_token": "..." }
// O Web App deve aceitar chamadas apenas do gateway: configure GATEWAY_SECRET
// nas Propriedades do script e use o mesmo segredo no Cloud Run Secret Manager.
//
// Primeiros passos (resumo):
//   1) Rode setupBanco() uma vez (cria as abas).
//   2) Rode autorizar() uma vez (libera o envio de e-mail).
//   3) Implantar > Nova implantação > App da Web > Executar como: Eu > Acesso: Qualquer pessoa.
//   4) Crie seu usuário pelo app (/register) ou rode criarAdmin() (veja a função).
// ============================================================

const VERSION = "2.0.0";
const SPREADSHEET_ID = "1iCWyX2vH7W-1LpKciD69XwEG_6b2pZD98X7Uj4S5F6k";

const SESSION_DAYS = 30;       // validade do login
const SESSION_MAX_DAYS = 90;   // exigir nova autenticação após 90 dias
const OTP_MINUTES = 15;        // validade do código por e-mail
const HASH_ROUNDS = 300;       // custo do hash de senha
const MAX_LOGIN_FAILS = 8;     // tentativas erradas antes de bloquear por 15 min
const MAX_LIMIT = 500;         // máximo de registros por página

// Abas internas (não acessíveis por records.*)
const T_USERS = "_Users";
const T_SESSIONS = "_Sessions";
const T_OTPS = "_Otps";
const COLS_USERS = ["id", "email", "full_name", "role", "password_hash", "password_salt", "verified", "google_sub", "picture_url", "created_date", "updated_date"];
const COLS_SESSIONS = ["token_hash", "session_id", "user_id", "issued_at", "expires_at", "created_date"];
const COLS_OTPS = ["email", "purpose", "code_hash", "expires_at", "attempts", "created_date"];
const T_AUDIT = "_AuditLog";
const COLS_AUDIT = ["created_date", "event", "user_id", "entity", "record_id"];

const SYSTEM_COLUMNS = ["id", "created_date", "updated_date", "created_by_id", "created_by"];
const OWNED_REFERENCES = {
  "Budget": { "category_id": "Category" },
  "CardInvoice": { "account_id": "Account" },
  "InvestmentOperation": { "investment_id": "Investment" },
  "Transaction": {
    "account_id": "Account",
    "counterpart_account_id": "Account",
    "card_invoice_account_id": "Account",
    "debt_id": "Debt",
    "category_id": "Category"
  }
};

// Esquema das entidades (gerado a partir de base44/entities/*.jsonc)
const SCHEMA = {
  "Account": {
    "required": [
      "name",
      "type"
    ],
    "props": {
      "name": {
        "type": "string"
      },
      "institution": {
        "type": "string"
      },
      "type": {
        "type": "string",
        "default": "checking"
      },
      "environment": {
        "type": "string",
        "default": "pf"
      },
      "opening_balance": {
        "type": "number",
        "default": 0
      },
      "credit_limit": {
        "type": "number",
        "default": 0
      },
      "closing_day": {
        "type": "number"
      },
      "due_day": {
        "type": "number"
      },
      "currency": {
        "type": "string",
        "default": "BRL"
      },
      "archived": {
        "type": "boolean",
        "default": false
      },
      "notes": {
        "type": "string"
      }
    }
  },
  "Budget": {
    "required": [
      "category_id",
      "month",
      "amount"
    ],
    "props": {
      "category_id": {
        "type": "string"
      },
      "environment": {
        "type": "string",
        "default": "pf"
      },
      "month": {
        "type": "string"
      },
      "amount": {
        "type": "number",
        "default": 0
      },
      "alert_percent": {
        "type": "number",
        "default": 80
      },
      "notes": {
        "type": "string"
      }
    }
  },
  "CardInvoice": {
    "required": [
      "account_id"
    ],
    "props": {
      "account_id": {
        "type": "string"
      },
      "environment": {
        "type": "string",
        "default": "pf"
      },
      "institution": {
        "type": "string"
      },
      "card_mask": {
        "type": "string"
      },
      "closing_date": {
        "type": "string",
        "format": "date"
      },
      "due_date": {
        "type": "string",
        "format": "date"
      },
      "period_from": {
        "type": "string",
        "format": "date"
      },
      "period_to": {
        "type": "string",
        "format": "date"
      },
      "previous_balance": {
        "type": "number",
        "default": 0
      },
      "declared_total": {
        "type": "number",
        "default": 0
      },
      "minimum_payment": {
        "type": "number",
        "default": 0
      },
      "items_total": {
        "type": "number",
        "default": 0
      },
      "items_count": {
        "type": "number",
        "default": 0
      },
      "summary_only": {
        "type": "boolean",
        "default": false
      },
      "fingerprint": {
        "type": "string"
      },
      "source": {
        "type": "string",
        "default": "pdf_import"
      },
      "source_file_name": {
        "type": "string"
      },
      "source_file_uri": {
        "type": "string"
      },
      "status": {
        "type": "string",
        "default": "confirmado"
      },
      "transaction_ids": {
        "type": "array"
      },
      "notes": {
        "type": "string"
      }
    }
  },
  "Category": {
    "required": [
      "name",
      "kind"
    ],
    "props": {
      "name": {
        "type": "string"
      },
      "kind": {
        "type": "string",
        "default": "expense"
      },
      "group": {
        "type": "string",
        "default": "operacional"
      },
      "environment": {
        "type": "string",
        "default": "pf"
      },
      "color": {
        "type": "string"
      }
    }
  },
  "ContactMessage": {
    "required": [
      "name",
      "email",
      "message"
    ],
    "props": {
      "name": {
        "type": "string"
      },
      "email": {
        "type": "string"
      },
      "message": {
        "type": "string"
      }
    }
  },
  "Debt": {
    "required": [
      "name",
      "outstanding_balance"
    ],
    "props": {
      "name": {
        "type": "string"
      },
      "creditor": {
        "type": "string"
      },
      "environment": {
        "type": "string",
        "default": "pf"
      },
      "principal": {
        "type": "number",
        "default": 0
      },
      "outstanding_balance": {
        "type": "number",
        "default": 0
      },
      "annual_interest_rate": {
        "type": "number",
        "default": 0
      },
      "future_interest": {
        "type": "number",
        "default": 0
      },
      "installment_amount": {
        "type": "number",
        "default": 0
      },
      "installments_total": {
        "type": "number",
        "default": 0
      },
      "installments_paid": {
        "type": "number",
        "default": 0
      },
      "start_date": {
        "type": "string",
        "format": "date"
      },
      "maturity_date": {
        "type": "string",
        "format": "date"
      },
      "term": {
        "type": "string",
        "default": "nao_classificado"
      },
      "due_day": {
        "type": "number"
      },
      "notes": {
        "type": "string"
      }
    }
  },
  "Goal": {
    "required": [
      "name",
      "target_amount"
    ],
    "props": {
      "name": {
        "type": "string"
      },
      "environment": {
        "type": "string",
        "default": "pf"
      },
      "target_amount": {
        "type": "number",
        "default": 0
      },
      "saved_amount": {
        "type": "number",
        "default": 0
      },
      "deadline": {
        "type": "string",
        "format": "date"
      },
      "priority": {
        "type": "string",
        "default": "media"
      },
      "status": {
        "type": "string",
        "default": "ativa"
      },
      "notes": {
        "type": "string"
      }
    }
  },
  "Investment": {
    "required": [
      "name"
    ],
    "props": {
      "name": {
        "type": "string"
      },
      "ticker": {
        "type": "string"
      },
      "asset_class": {
        "type": "string",
        "default": "renda_fixa"
      },
      "environment": {
        "type": "string",
        "default": "invest"
      },
      "institution": {
        "type": "string"
      },
      "quantity": {
        "type": "number",
        "default": 0
      },
      "avg_price": {
        "type": "number",
        "default": 0
      },
      "current_price": {
        "type": "number",
        "default": 0
      },
      "quote_date": {
        "type": "string",
        "format": "date"
      },
      "notes": {
        "type": "string"
      }
    }
  },
  "InvestmentOperation": {
    "required": [
      "investment_id",
      "type",
      "date"
    ],
    "props": {
      "investment_id": {
        "type": "string"
      },
      "type": {
        "type": "string",
        "default": "aporte"
      },
      "date": {
        "type": "string",
        "format": "date"
      },
      "quantity": {
        "type": "number",
        "default": 0
      },
      "price": {
        "type": "number",
        "default": 0
      },
      "fees": {
        "type": "number",
        "default": 0
      },
      "notes": {
        "type": "string"
      }
    }
  },
  "Preferences": {
    "required": [],
    "props": {
      "theme": {
        "type": "string",
        "default": "system"
      },
      "privacy_mode": {
        "type": "boolean",
        "default": false
      },
      "active_environment": {
        "type": "string",
        "default": "pf"
      },
      "currency": {
        "type": "string",
        "default": "BRL"
      },
      "agenda_days": {
        "type": "number",
        "default": 10
      },
      "projection_months": {
        "type": "number",
        "default": 12
      }
    }
  },
  "Pricing": {
    "required": [
      "name"
    ],
    "props": {
      "name": {
        "type": "string"
      },
      "environment": {
        "type": "string",
        "default": "pj"
      },
      "unit_name": {
        "type": "string"
      },
      "variable_cost": {
        "type": "number",
        "default": 0
      },
      "fixed_cost_monthly": {
        "type": "number",
        "default": 0
      },
      "tax_percent": {
        "type": "number",
        "default": 0
      },
      "commission_percent": {
        "type": "number",
        "default": 0
      },
      "desired_margin_percent": {
        "type": "number",
        "default": 0
      },
      "current_price": {
        "type": "number",
        "default": 0
      },
      "expected_monthly_units": {
        "type": "number",
        "default": 0
      },
      "notes": {
        "type": "string"
      }
    }
  },
  "TaxScenario": {
    "required": [
      "name"
    ],
    "props": {
      "name": {
        "type": "string"
      },
      "activity": {
        "type": "string",
        "default": "servicos"
      },
      "service_annex": {
        "type": "string",
        "default": "III"
      },
      "monthly_revenue": {
        "type": "number",
        "default": 0
      },
      "annual_revenue": {
        "type": "number",
        "default": 0
      },
      "profit_margin_percent": {
        "type": "number",
        "default": 20
      },
      "payroll": {
        "type": "number",
        "default": 0
      },
      "iss_percent": {
        "type": "number",
        "default": 5
      },
      "mei_das": {
        "type": "number",
        "default": 76
      },
      "notes": {
        "type": "string"
      }
    }
  },
  "Transaction": {
    "required": [
      "description",
      "kind",
      "amount"
    ],
    "props": {
      "description": {
        "type": "string"
      },
      "kind": {
        "type": "string",
        "default": "expense"
      },
      "amount": {
        "type": "number",
        "default": 0
      },
      "environment": {
        "type": "string",
        "default": "pf"
      },
      "account_id": {
        "type": "string"
      },
      "counterpart_account_id": {
        "type": "string"
      },
      "card_invoice_account_id": {
        "type": "string"
      },
      "debt_id": {
        "type": "string"
      },
      "category_id": {
        "type": "string"
      },
      "competence_date": {
        "type": "string",
        "format": "date"
      },
      "due_date": {
        "type": "string",
        "format": "date"
      },
      "settlement_date": {
        "type": "string",
        "format": "date"
      },
      "status": {
        "type": "string",
        "default": "pending"
      },
      "settled_amount": {
        "type": "number",
        "default": 0
      },
      "notes": {
        "type": "string"
      }
    }
  }
};

// ---------------------------------------------------------------
// Utilitários de resposta e erro
// ---------------------------------------------------------------
class HttpError extends Error {
  constructor(message, httpStatus) {
    super(message);
    this.httpStatus = httpStatus || 400;
  }
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function parseMaybeJson_(v, fallback) {
  if (v === undefined || v === null || v === "") return fallback;
  if (typeof v === "string") {
    try { return JSON.parse(v); } catch (e) { return v; }
  }
  return v;
}

function nowIso_() { return new Date().toISOString(); }

// ---------------------------------------------------------------
// Pontos de entrada
// ---------------------------------------------------------------
function doGet(e) {
  return dispatch_((e && e.parameter) ? e.parameter : {}, "GET");
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
  } catch (err) {
    return out_({ status: "erro", mensagem: "JSON inválido", httpStatus: 400 });
  }
  return dispatch_(body, "POST");
}

function dispatch_(p, method) {
  var action = "";
  var gatewayAuthorized = false;
  try {
    action = String(p.action || "").trim();
    if (!action) {
      return out_({ status: "sucesso", data: { app: "Data.FinTech API", versao: VERSION, online: true } });
    }
    if (action !== "auth.publicSettings") {
      requireGateway_(p);
      gatewayAuthorized = true;
    }
    var h = ACTIONS[action];
    if (!h) throw new HttpError("Ação desconhecida: " + action, 404);
    if (h.write && method !== "POST") throw new HttpError("Use POST para esta ação.", 405);

    var actor = optionalUser_(p);
    var result;
    if (h.write) {
      var lock = LockService.getScriptLock();
      lock.waitLock(20000);
      try {
        result = h.fn(p);
        var auditActor = actor || (result && result.user) ||
          (result && result.user_id ? { id: result.user_id, role: "user" } : null);
        auditEvent_(action, auditActor, p.entity, result && result.id, true);
      } finally {
        lock.releaseLock();
      }
    } else {
      result = h.fn(p);
    }
    return out_({ status: "sucesso", data: result === undefined ? null : result });
  } catch (err) {
    if (gatewayAuthorized && /^auth\.(register|login|verifyOtp|googleLogin|logout|resetPasswordRequest|resetPassword)$/.test(action)) {
      auditEvent_(action + ".failure", null, "", "", false);
    }
    if (err instanceof HttpError) {
      return out_({ status: "erro", mensagem: err.message, httpStatus: err.httpStatus });
    }
    Logger.log("Erro interno na ação " + (action || "desconhecida") + ".");
    return out_({ status: "erro", mensagem: "Erro interno.", httpStatus: 500 });
  }
}

const ACTIONS = {
  "auth.publicSettings": { fn: function () { return { id: "data-fintech", public_settings: {} }; } },
  "auth.register": { write: true, fn: authRegister_ },
  "auth.verifyOtp": { write: true, fn: authVerifyOtp_ },
  "auth.resendOtp": { write: true, fn: authResendOtp_ },
  "auth.login": { write: true, fn: authLogin_ },
  "auth.googleLogin": { write: true, fn: authGoogleLogin_ },
  "auth.me": { fn: authMe_ },
  "auth.renew": { write: true, fn: authRenew_ },
  "auth.logout": { write: true, fn: authLogout_ },
  "auth.resetPasswordRequest": { write: true, fn: authResetRequest_ },
  "auth.resetPassword": { write: true, fn: authResetPassword_ },
  "audit.record": { write: true, fn: auditRecord_ },
  "auth.googleLoginUrl": { fn: function () { throw new HttpError("Login com Google não está configurado.", 501); } },
  "mcp.consentInfo": { fn: function () { throw new HttpError("Recurso não disponível.", 501); } },
  "invoices.upload": { write: true, fn: function () { throw new HttpError("Importação de fatura por arquivo não está disponível nesta versão.", 501); } },
  "invoices.extract": { write: true, fn: function () { throw new HttpError("Importação de fatura por arquivo não está disponível nesta versão.", 501); } },
  "records.list": { fn: recList_ },
  "records.count": { fn: recCount_ },
  "records.create": { write: true, fn: recCreate_ },
  "records.bulkCreate": { write: true, fn: recBulkCreate_ },
  "records.importInvoice": { write: true, fn: recImportInvoice_ },
  "records.update": { write: true, fn: recUpdate_ },
  "records.delete": { write: true, fn: recDelete_ },
  "records.deleteMany": { write: true, fn: recDeleteMany_ }
};

// ---------------------------------------------------------------
// Planilha: abas, cabeçalhos e leitura/gravação
// ---------------------------------------------------------------
var _ss = null;
function ss_() {
  if (!_ss) _ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return _ss;
}

function colsOf_(entity) {
  return SYSTEM_COLUMNS.concat(Object.keys(SCHEMA[entity].props));
}

function gatewaySecretMatches_(supplied, expected) {
  var left = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(supplied || ""), Utilities.Charset.UTF_8);
  var right = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(expected || ""), Utilities.Charset.UTF_8);
  var difference = left.length ^ right.length;
  for (var i = 0; i < left.length; i++) difference |= left[i] ^ right[i];
  return difference === 0 && String(expected || "").length >= 32;
}

function requireGateway_(p) {
  var expected = PropertiesService.getScriptProperties().getProperty("GATEWAY_SECRET");
  if (!expected) throw new HttpError("Gateway não configurado.", 503);
  if (!gatewaySecretMatches_(p.gateway_secret, expected)) throw new HttpError("Requisição não autorizada.", 401);
}

function auditEvent_(event, actor, entity, recordId, success) {
  try {
    var table = readTable_(T_AUDIT, COLS_AUDIT, null);
    appendRows_(table, [{
      created_date: nowIso_(),
      event: String(event || "unknown").slice(0, 80),
      user_id: actor && actor.id ? String(actor.id) : "",
      entity: String(entity || "").slice(0, 80),
      record_id: String(recordId || "").slice(0, 80)
    }]);
    pruneAuditLog_();
  } catch (err) {
    Logger.log("Falha ao registrar auditoria para ação " + String(event || "unknown").slice(0, 80) + ".");
    if (success) throw new HttpError("Não foi possível registrar a auditoria da operação.", 503);
  }
}

function pruneAuditLog_() {
  var cache = CacheService.getScriptCache();
  if (cache.get("audit:pruned")) return;
  var table = readTable_(T_AUDIT, COLS_AUDIT, null);
  var cutoff = Date.now() - 365 * 86400000;
  var expired = table.rows.filter(function (row) {
    var time = Date.parse(String(row.obj.created_date || ""));
    return Number.isFinite(time) && time < cutoff;
  }).map(function (row) { return row.rowNum; });
  deleteRowNums_(table, expired);
  cache.put("audit:pruned", "1", 21600);
}

function auditRecord_(p) {
  var user = requireUser_(p);
  var event = String(p.event || "");
  if (event !== "backup.export" && event !== "backup.restore" && event !== "backup.restore.start") {
    throw new HttpError("Evento de auditoria inválido.", 400);
  }
  auditEvent_(event, user, "", "", true);
  return { ok: true };
}

function isTextCol_(entity, col) {
  if (!entity) return true;
  if (SYSTEM_COLUMNS.indexOf(col) >= 0) return true;
  var def = SCHEMA[entity].props[col];
  return !def || def.type === "string" || def.type === "array" || def.type === "object";
}

function ensureGrid_(sh, rows, cols) {
  if (rows && sh.getMaxRows() < rows) sh.insertRowsAfter(sh.getMaxRows(), rows - sh.getMaxRows());
  if (cols && sh.getMaxColumns() < cols) sh.insertColumnsAfter(sh.getMaxColumns(), cols - sh.getMaxColumns());
}

function formatTextCols_(sh, entity, headers, fromIdx) {
  var rows = Math.max(sh.getMaxRows() - 1, 1);
  for (var i = fromIdx; i < headers.length; i++) {
    if (isTextCol_(entity, headers[i])) sh.getRange(2, i + 1, rows, 1).setNumberFormat("@");
  }
}

// Garante que a aba existe e que todas as colunas do esquema estão no cabeçalho.
function getSheet_(name, columns, entity) {
  var ss = ss_();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    ensureGrid_(sh, 2, columns.length);
    sh.getRange(1, 1, 1, columns.length).setValues([columns]).setFontWeight("bold");
    sh.setFrozenRows(1);
    formatTextCols_(sh, entity, columns, 0);
    return sh;
  }
  var last = sh.getLastColumn();
  var header = last > 0 ? sh.getRange(1, 1, 1, last).getValues()[0].map(function (h) { return String(h).trim(); }) : [];
  var missing = columns.filter(function (c) { return header.indexOf(c) < 0; });
  if (missing.length) {
    ensureGrid_(sh, 2, last + missing.length);
    sh.getRange(1, last + 1, 1, missing.length).setValues([missing]).setFontWeight("bold");
    sh.setFrozenRows(1);
    formatTextCols_(sh, entity, header.concat(missing), last);
  }
  return sh;
}

// Lê a aba inteira. Devolve { sh, headers, rows: [{ rowNum, obj }] } (linhas sem conteúdo são ignoradas).
function readTable_(name, columns, entity) {
  var sh = getSheet_(name, columns, entity);
  var lastRow = sh.getLastRow();
  var lastCol = sh.getLastColumn();
  var headers = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h).trim(); });
  var rows = [];
  if (lastRow >= 2) {
    var values = sh.getRange(2, 1, lastRow - 1, lastCol).getValues();
    for (var r = 0; r < values.length; r++) {
      var obj = {};
      var any = false;
      for (var c = 0; c < headers.length; c++) {
        if (!headers[c]) continue;
        var v = values[r][c];
        obj[headers[c]] = v;
        if (v !== "" && v !== null) any = true;
      }
      if (any) rows.push({ rowNum: r + 2, obj: obj });
    }
  }
  return { sh: sh, headers: headers, rows: rows };
}

function rowArray_(headers, obj) {
  return headers.map(function (h) { return (h && obj[h] !== undefined && obj[h] !== null) ? obj[h] : ""; });
}

function appendRows_(table, objs) {
  if (!objs.length) return;
  var start = Math.max(table.sh.getLastRow(), 1) + 1;
  ensureGrid_(table.sh, start + objs.length - 1, table.headers.length);
  var data = objs.map(function (o) { return rowArray_(table.headers, o); });
  table.sh.getRange(start, 1, data.length, table.headers.length).setValues(data);
}

function writeRow_(table, rowNum, obj) {
  table.sh.getRange(rowNum, 1, 1, table.headers.length).setValues([rowArray_(table.headers, obj)]);
}

function deleteRowNums_(table, rowNums) {
  if (!rowNums.length) return;
  var sorted = rowNums.slice().sort(function (a, b) { return b - a; });
  var i = 0;
  while (i < sorted.length) {
    var end = sorted[i], count = 1;
    while (i + count < sorted.length && sorted[i + count] === end - count) count++;
    table.sh.deleteRows(end - count + 1, count);
    i += count;
  }
}

// ---------------------------------------------------------------
// Conversão de tipos (planilha <-> JSON)
// ---------------------------------------------------------------
function decode_(def, v) {
  if (v === "" || v === null || v === undefined) return null;
  if (v instanceof Date) {
    if (def && def.format === "date") return Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd");
    return v.toISOString();
  }
  var type = def ? def.type : "string";
  if (type === "number") {
    var n = (typeof v === "number") ? v : Number(String(v).replace(",", "."));
    return isNaN(n) ? null : n;
  }
  if (type === "boolean") return v === true || String(v).toLowerCase() === "true";
  if (type === "array" || type === "object") {
    if (typeof v !== "string") return v;
    try { return JSON.parse(v); } catch (e) { return type === "array" ? [] : {}; }
  }
  return typeof v === "string" ? v : String(v);
}

function encode_(def, v) {
  if (v === null || v === undefined) return "";
  var type = def ? def.type : "string";
  if (type === "number") {
    var n = Number(v);
    return isFinite(n) ? n : "";
  }
  if (type === "boolean") return v === true || v === "true";
  if (type === "array" || type === "object") return typeof v === "string" ? v : JSON.stringify(v);
  return typeof v === "string" ? v : String(v);
}

function toRecord_(entity, obj) {
  var props = SCHEMA[entity].props;
  var rec = {};
  Object.keys(obj).forEach(function (k) {
    if (!k) return;
    rec[k] = decode_(props[k], obj[k]);
  });
  return rec;
}

function requireEntity_(name) {
  name = String(name || "");
  if (!Object.prototype.hasOwnProperty.call(SCHEMA, name)) {
    throw new HttpError("Entidade desconhecida: " + name, 404);
  }
  return name;
}

// ---------------------------------------------------------------
// Filtros (query) e ordenação
// ---------------------------------------------------------------
function eq_(a, b) {
  if (a === null || a === undefined) return b === null || b === undefined;
  if (b === null || b === undefined) return false;
  if (typeof a === "boolean") return a === (b === true || b === "true");
  return String(a) === String(b);
}

function cmp_(a, b) {
  if (typeof a === "number") return a - Number(b);
  var x = String(a), y = String(b);
  return x < y ? -1 : (x > y ? 1 : 0);
}

function fieldMatches_(val, cond) {
  if (cond !== null && typeof cond === "object" && !Array.isArray(cond)) {
    var ops = Object.keys(cond);
    for (var i = 0; i < ops.length; i++) {
      var op = ops[i], arg = cond[op];
      switch (op) {
        case "$eq": if (!eq_(val, arg)) return false; break;
        case "$ne": if (eq_(val, arg)) return false; break;
        case "$in": if (!(arg || []).some(function (x) { return eq_(val, x); })) return false; break;
        case "$nin": if ((arg || []).some(function (x) { return eq_(val, x); })) return false; break;
        case "$gt": if (val === null || !(cmp_(val, arg) > 0)) return false; break;
        case "$gte": if (val === null || !(cmp_(val, arg) >= 0)) return false; break;
        case "$lt": if (val === null || !(cmp_(val, arg) < 0)) return false; break;
        case "$lte": if (val === null || !(cmp_(val, arg) <= 0)) return false; break;
        case "$exists": if ((val !== null) !== !!arg) return false; break;
        case "$options": break;
        case "$regex": {
          if (val === null) return false;
          var text = String(val), ok = false;
          try { ok = new RegExp(String(arg), "i").test(text); }
          catch (e) { ok = text.toLowerCase().indexOf(String(arg).toLowerCase()) >= 0; }
          if (!ok) return false;
          break;
        }
        default: throw new HttpError("Operador não suportado: " + op, 400);
      }
    }
    return true;
  }
  return eq_(val, cond);
}

function matches_(rec, q) {
  if (!q || typeof q !== "object") return true;
  var keys = Object.keys(q);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i], cond = q[k];
    if (k === "$or") { if (!cond.some(function (c) { return matches_(rec, c); })) return false; }
    else if (k === "$and") { if (!cond.every(function (c) { return matches_(rec, c); })) return false; }
    else if (k === "$nor") { if (cond.some(function (c) { return matches_(rec, c); })) return false; }
    else if (k.charAt(0) === "$") throw new HttpError("Operador não suportado: " + k, 400);
    else if (!fieldMatches_(rec[k], cond)) return false;
  }
  return true;
}

function sortRecords_(items, sortSpec) {
  var specs = String(sortSpec || "-created_date").split(",").map(function (s) {
    s = s.trim();
    return s.charAt(0) === "-" ? { f: s.slice(1), d: -1 } : { f: s.replace(/^\+/, ""), d: 1 };
  }).filter(function (s) { return s.f; });
  items.sort(function (a, b) {
    for (var i = 0; i < specs.length; i++) {
      var x = a[specs[i].f], y = b[specs[i].f];
      if (x === y) continue;
      if (x === null || x === undefined) return 1;   // vazios sempre no fim
      if (y === null || y === undefined) return -1;
      var c = (typeof x === "number" && typeof y === "number") ? x - y : (String(x) < String(y) ? -1 : 1);
      if (c !== 0) return c * specs[i].d;
    }
    return 0;
  });
  return items;
}

// ---------------------------------------------------------------
// CRUD genérico: records.*
// ---------------------------------------------------------------
function loadOwned_(entity, user) {
  var table = readTable_(entity, colsOf_(entity), entity);
  var list = [];
  table.rows.forEach(function (r) {
    var rec = toRecord_(entity, r.obj);
    if (!rec.id) return;
    var mine = user && rec.created_by_id === user.id;
    var adminOnly = entity === "ContactMessage" && user && user.role === "admin";
    if (mine || adminOnly) list.push({ rowNum: r.rowNum, rec: rec });
  });
  return { table: table, list: list };
}

function recList_(p) {
  var user = requireUser_(p);
  var entity = requireEntity_(p.entity);
  var q = parseMaybeJson_(p.query, {});
  var data = loadOwned_(entity, user);
  var items = data.list.map(function (x) { return x.rec; }).filter(function (r) { return matches_(r, q); });
  sortRecords_(items, p.sort);
  var limit = Math.min(Math.max(parseInt(p.limit, 10) || 50, 1), MAX_LIMIT);
  var offset = Math.max(parseInt(p.cursor, 10) || 0, 0);
  var page = items.slice(offset, offset + limit);
  var hasMore = offset + limit < items.length;
  return { items: page, next_cursor: hasMore ? String(offset + limit) : null, has_more: hasMore };
}

function recCount_(p) {
  var user = requireUser_(p);
  var entity = requireEntity_(p.entity);
  var q = parseMaybeJson_(p.query, {});
  return loadOwned_(entity, user).list.filter(function (x) { return matches_(x.rec, q); }).length;
}

function buildRecord_(entity, values, user) {
  var def = SCHEMA[entity];
  var vals = {};
  Object.keys(values || {}).forEach(function (k) {
    if (def.props[k] && SYSTEM_COLUMNS.indexOf(k) < 0) vals[k] = values[k];
  });
  Object.keys(def.props).forEach(function (k) {
    if ((vals[k] === undefined || vals[k] === null) && def.props[k].default !== undefined) vals[k] = def.props[k].default;
  });
  def.required.forEach(function (k) {
    if (vals[k] === undefined || vals[k] === null || vals[k] === "") {
      throw new HttpError("Campo obrigatório ausente: " + k, 400);
    }
  });
  validateOwnedReferences_(entity, vals, user);
  var now = nowIso_();
  var obj = {
    id: Utilities.getUuid().replace(/-/g, "").slice(0, 24),
    created_date: now,
    updated_date: now,
    created_by_id: user ? user.id : "",
    created_by: user ? user.email : ""
  };
  Object.keys(vals).forEach(function (k) { obj[k] = encode_(def.props[k], vals[k]); });
  return obj;
}

function recCreate_(p) {
  var entity = requireEntity_(p.entity);
  var user = (entity === "ContactMessage") ? optionalUser_(p) : requireUser_(p);
  var table = readTable_(entity, colsOf_(entity), entity);
  var obj = buildRecord_(entity, parseMaybeJson_(p.values, {}), user);
  appendRows_(table, [obj]);
  return toRecord_(entity, obj);
}

function recBulkCreate_(p) {
  var user = requireUser_(p);
  var entity = requireEntity_(p.entity);
  var values = parseMaybeJson_(p.values, []);
  if (!Array.isArray(values)) throw new HttpError("values deve ser uma lista.", 400);
  if (values.length > 500) throw new HttpError("Máximo de 500 registros por chamada.", 400);
  var table = readTable_(entity, colsOf_(entity), entity);
  var objs = values.map(function (v) { return buildRecord_(entity, v, user); });
  appendRows_(table, objs);
  return objs.map(function (o) { return toRecord_(entity, o); });
}

function recImportInvoice_(p) {
  var user = requireUser_(p);
  var transactions = parseMaybeJson_(p.transactions, []);
  var invoiceValues = parseMaybeJson_(p.invoice, {});
  if (!Array.isArray(transactions) || transactions.length < 1 || transactions.length > 200) {
    throw new HttpError("A importação deve conter de 1 a 200 lançamentos.", 400);
  }
  if (!invoiceValues || typeof invoiceValues !== "object" || Array.isArray(invoiceValues)) {
    throw new HttpError("Dados da fatura inválidos.", 400);
  }

  var accountId = String(invoiceValues.account_id || "");
  var fingerprint = String(invoiceValues.fingerprint || "");
  if (!fingerprint) throw new HttpError("Impressão digital da fatura ausente.", 400);
  if (loadOwned_("CardInvoice", user).list.some(function (item) {
    return item.rec.account_id === accountId && item.rec.fingerprint === fingerprint && item.rec.status !== "descartado";
  })) {
    throw new HttpError("Esta fatura já foi importada para o cartão selecionado.", 409);
  }
  var ownedAccount = loadOwned_("Account", user).list.filter(function (item) {
    return item.rec.id === accountId;
  })[0];
  if (!ownedAccount || ownedAccount.rec.type !== "credit_card") {
    throw new HttpError("Cartão inválido ou não autorizado.", 403);
  }
  var environment = String(ownedAccount.rec.environment || "pf");
  if (String(invoiceValues.environment || environment) !== environment) {
    throw new HttpError("O ambiente da fatura não corresponde ao cartão.", 400);
  }

  var transactionObjs = transactions.map(function (values) {
    if (
      !values ||
      typeof values !== "object" ||
      String(values.account_id || "") !== accountId ||
      String(values.card_invoice_account_id || "") !== accountId ||
      String(values.environment || "") !== environment ||
      !["expense", "income"].includes(String(values.kind || "")) ||
      !Number.isFinite(Number(values.amount)) ||
      Number(values.amount) <= 0
    ) {
      throw new HttpError("Lançamento inválido para o cartão selecionado.", 400);
    }
    return buildRecord_("Transaction", values, user);
  });
  var transactionIds = transactionObjs.map(function (item) { return item.id; });
  invoiceValues.account_id = accountId;
  invoiceValues.environment = environment;
  invoiceValues.transaction_ids = transactionIds;
  invoiceValues.status = "confirmado";
  invoiceValues.source = "pdf_import";
  var invoiceObj = buildRecord_("CardInvoice", invoiceValues, user);
  var transactionTable = readTable_("Transaction", colsOf_("Transaction"), "Transaction");
  var invoiceTable = readTable_("CardInvoice", colsOf_("CardInvoice"), "CardInvoice");

  try {
    appendRows_(transactionTable, transactionObjs);
    appendRows_(invoiceTable, [invoiceObj]);
  } catch (error) {
    try {
      [ ["Transaction", transactionIds], ["CardInvoice", [invoiceObj.id]] ].forEach(function (entry) {
        var owned = loadOwned_(entry[0], user);
        var rows = owned.list.filter(function (item) {
          return entry[1].indexOf(item.rec.id) >= 0;
        }).map(function (item) { return item.rowNum; });
        if (rows.length) deleteRowNums_(owned.table, rows);
      });
    } catch (rollbackError) {
      Logger.log("Falha ao reverter uma importação de fatura incompleta.");
      throw new HttpError("Falha ao concluir a importação; verifique os lançamentos antes de tentar novamente.", 500);
    }
    throw error;
  }

  return {
    invoice: toRecord_("CardInvoice", invoiceObj),
    transactions: transactionObjs.map(function (item) { return toRecord_("Transaction", item); })
  };
}

function recUpdate_(p) {
  var user = requireUser_(p);
  var entity = requireEntity_(p.entity);
  var def = SCHEMA[entity];
  var data = loadOwned_(entity, user);
  var found = data.list.filter(function (x) { return x.rec.id === String(p.id); })[0];
  if (!found) throw new HttpError("Registro não encontrado.", 404);
  var values = parseMaybeJson_(p.values, {});
  var row = {};
  data.table.rows.forEach(function (r) { if (r.rowNum === found.rowNum) row = r.obj; });
  Object.keys(values).forEach(function (k) {
    if (def.props[k] && SYSTEM_COLUMNS.indexOf(k) < 0) row[k] = encode_(def.props[k], values[k]);
  });
  validateOwnedReferences_(entity, row, user);
  def.required.forEach(function (k) {
    var v = row[k];
    if (v === undefined || v === null || v === "") throw new HttpError("Campo obrigatório ausente: " + k, 400);
  });
  row.updated_date = nowIso_();
  writeRow_(data.table, found.rowNum, row);
  return toRecord_(entity, row);
}

function recDelete_(p) {
  var user = requireUser_(p);
  var entity = requireEntity_(p.entity);
  var data = loadOwned_(entity, user);
  var found = data.list.filter(function (x) { return x.rec.id === String(p.id); })[0];
  if (!found) throw new HttpError("Registro não encontrado.", 404);
  deleteRowNums_(data.table, [found.rowNum]);
  return { id: found.rec.id, deleted: 1 };
}

function recDeleteMany_(p) {
  var user = requireUser_(p);
  var entity = requireEntity_(p.entity);
  var q = parseMaybeJson_(p.query, {});
  var data = loadOwned_(entity, user);
  var nums = data.list.filter(function (x) { return matches_(x.rec, q); }).map(function (x) { return x.rowNum; });
  deleteRowNums_(data.table, nums);
  return { deleted: nums.length };
}

function validateOwnedReferences_(entity, values, user) {
  var refs = OWNED_REFERENCES[entity] || {};
  Object.keys(refs).forEach(function (field) {
    var id = String(values[field] || "");
    if (!id || (field === "category_id" && id === "dividas")) return;
    var owned = loadOwned_(refs[field], user).list.some(function (item) { return item.rec.id === id; });
    if (!owned) throw new HttpError("Referência inválida ou não autorizada: " + field + ".", 403);
  });
}

// ---------------------------------------------------------------
// Autenticação
// ---------------------------------------------------------------
function sha256hex_(s) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8);
  return bytes.map(function (b) { return ("0" + (b < 0 ? b + 256 : b).toString(16)).slice(-2); }).join("");
}

function hashPassword_(password, salt) {
  var h = salt + ":" + password;
  for (var i = 0; i < HASH_ROUNDS; i++) h = sha256hex_(h + salt + password);
  return h;
}

function newToken_() { return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, ""); }

function newCode_() {
  var n = parseInt(sha256hex_(Utilities.getUuid()).slice(0, 8), 16) % 1000000;
  return ("000000" + n).slice(-6);
}

function normEmail_(v) {
  var e = String(v || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new HttpError("E-mail inválido.", 400);
  return e;
}

function checkPassword_(v) {
  var pw = String(v || "");
  if (pw.length < 8) throw new HttpError("A senha precisa ter pelo menos 8 caracteres.", 400);
  return pw;
}

function publicUser_(u) {
  return {
    id: String(u.id),
    email: u.email,
    full_name: u.full_name || String(u.email).split("@")[0],
    role: u.role || "user",
    created_date: u.created_date || null,
    picture_url: u.picture_url || null
  };
}

function usersTable_() { return readTable_(T_USERS, COLS_USERS, null); }
function isVerified_(v) { return v === true || String(v).toLowerCase() === "true"; }

function findUser_(table, email) {
  return table.rows.filter(function (r) { return String(r.obj.email).toLowerCase() === email; })[0] || null;
}

function allowRegistration_(table) {
  var prop = PropertiesService.getScriptProperties().getProperty("ALLOW_REGISTRATION");
  if (prop === "true") return true;
  if (prop === "false") return false;
  return !table.rows.some(function (r) { return isVerified_(r.obj.verified); }); // padrão: só o primeiro usuário
}

function sendCode_(email, code, subject, intro) {
  MailApp.sendEmail({
    to: email,
    subject: "Data.FinTech - " + subject,
    body: intro + "\n\n" + code + "\n\nO código vale por " + OTP_MINUTES + " minutos. Se não foi você, ignore este e-mail."
  });
}

function saveOtp_(email, purpose, plain) {
  var t = readTable_(T_OTPS, COLS_OTPS, null);
  deleteRowNums_(t, t.rows.filter(function (r) { return r.obj.email === email && r.obj.purpose === purpose; }).map(function (r) { return r.rowNum; }));
  t = readTable_(T_OTPS, COLS_OTPS, null);
  appendRows_(t, [{
    email: email, purpose: purpose, code_hash: sha256hex_(plain),
    expires_at: Date.now() + OTP_MINUTES * 60000, attempts: 0, created_date: nowIso_()
  }]);
}

function createSession_(userId) {
  var token = newToken_();
  var t = readTable_(T_SESSIONS, COLS_SESSIONS, null);
  var now = Date.now();
  deleteRowNums_(t, t.rows.filter(function (r) {
    var issuedAt = Date.parse(String(r.obj.issued_at || r.obj.created_date || ""));
    var expiresAt = Number(r.obj.expires_at);
    return !Number.isFinite(expiresAt) ||
      expiresAt <= now ||
      !Number.isFinite(issuedAt) ||
      now - issuedAt >= SESSION_MAX_DAYS * 86400000;
  }).map(function (r) { return r.rowNum; }));
  t = readTable_(T_SESSIONS, COLS_SESSIONS, null);
  appendRows_(t, [{
    token_hash: sha256hex_(token),
    session_id: Utilities.getUuid().replace(/-/g, ""),
    user_id: userId,
    issued_at: nowIso_(),
    expires_at: now + SESSION_DAYS * 86400000,
    created_date: nowIso_()
  }]);
  return token;
}

function optionalUser_(p) {
  var token = String(p.access_token || "");
  if (!token) return null;
  var hash = sha256hex_(token);
  var s = readTable_(T_SESSIONS, COLS_SESSIONS, null).rows.filter(function (r) { return r.obj.token_hash === hash; })[0];
  var expiresAt = s ? Number(s.obj.expires_at) : NaN;
  if (!s || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;
  var issuedAt = Date.parse(String(s.obj.issued_at || s.obj.created_date || ""));
  if (!Number.isFinite(issuedAt) || Date.now() - issuedAt >= SESSION_MAX_DAYS * 86400000) return null;
  var u = usersTable_().rows.filter(function (r) { return String(r.obj.id) === String(s.obj.user_id); })[0];
  if (!u || !isVerified_(u.obj.verified)) return null;
  return publicUser_(u.obj);
}

function requireUser_(p) {
  var u = optionalUser_(p);
  if (!u) throw new HttpError("Autenticação necessária.", 401);
  return u;
}

function authRegister_(p) {
  var email = normEmail_(p.email);
  var password = checkPassword_(p.password);
  var t = usersTable_();
  var existing = findUser_(t, email);
  if (existing && isVerified_(existing.obj.verified)) throw new HttpError("Este e-mail já está cadastrado.", 409);
  if (!existing && !allowRegistration_(t)) throw new HttpError("Cadastro fechado. Peça ao administrador para liberar.", 403);

  var salt = Utilities.getUuid();
  var now = nowIso_();
  if (existing) {
    existing.obj.password_salt = salt;
    existing.obj.password_hash = hashPassword_(password, salt);
    existing.obj.updated_date = now;
    writeRow_(t, existing.rowNum, existing.obj);
  } else {
    appendRows_(t, [{
      id: Utilities.getUuid().replace(/-/g, "").slice(0, 24), email: email, full_name: email.split("@")[0],
      role: "user", password_hash: hashPassword_(password, salt), password_salt: salt,
      verified: false, created_date: now, updated_date: now
    }]);
  }
  var code = newCode_();
  saveOtp_(email, "verify", code);
  sendCode_(email, code, "código de verificação", "Use este código para confirmar seu cadastro:");
  return { email: email, otp_sent: true };
}

function authResendOtp_(p) {
  var email = normEmail_(p.email);
  var u = findUser_(usersTable_(), email);
  if (u && !isVerified_(u.obj.verified)) {
    var code = newCode_();
    saveOtp_(email, "verify", code);
    sendCode_(email, code, "código de verificação", "Use este código para confirmar seu cadastro:");
  }
  return { otp_sent: true };
}

function authVerifyOtp_(p) {
  var email = normEmail_(p.email);
  var code = String(p.otp_code || "").trim();
  var ot = readTable_(T_OTPS, COLS_OTPS, null);
  var rec = ot.rows.filter(function (r) { return r.obj.email === email && r.obj.purpose === "verify"; })[0];
  if (!rec || Number(rec.obj.expires_at) < Date.now()) throw new HttpError("Código expirado. Peça um novo.", 400);
  if (Number(rec.obj.attempts) >= 5) throw new HttpError("Tentativas demais. Peça um novo código.", 429);
  if (rec.obj.code_hash !== sha256hex_(code)) {
    rec.obj.attempts = Number(rec.obj.attempts) + 1;
    writeRow_(ot, rec.rowNum, rec.obj);
    throw new HttpError("Código inválido.", 400);
  }
  deleteRowNums_(ot, [rec.rowNum]);

  var t = usersTable_();
  var u = findUser_(t, email);
  if (!u) throw new HttpError("Usuário não encontrado.", 404);
  u.obj.verified = true;
  if (!u.obj.role) u.obj.role = "user";
  u.obj.updated_date = nowIso_();
  writeRow_(t, u.rowNum, u.obj);
  return { access_token: createSession_(String(u.obj.id)), user: publicUser_(u.obj) };
}

function authGoogleLogin_(p) {
  var googleSub = String(p.google_sub || "").trim();
  var email = normEmail_(p.email);
  if (!googleSub || p.email_verified !== true) throw new HttpError("Identidade Google não verificada.", 401);
  var picture = String(p.picture_url || "");
  if (picture && !/^https:\/\/lh3\.googleusercontent\.com\//.test(picture)) picture = "";
  var table = usersTable_();
  var bySub = table.rows.filter(function (row) { return String(row.obj.google_sub || "") === googleSub; })[0];
  var byEmail = findUser_(table, email);
  var userRow = bySub || byEmail;

  if (bySub && byEmail && String(bySub.obj.id) !== String(byEmail.obj.id)) {
    throw new HttpError("Não foi possível vincular esta conta Google.", 409);
  }
  if (bySub && String(bySub.obj.email).toLowerCase() !== email && byEmail) {
    throw new HttpError("O e-mail Google já está vinculado a outra conta.", 409);
  }
  if (!userRow) {
    if (!allowRegistration_(table)) throw new HttpError("Cadastro fechado. Peça ao administrador para liberar.", 403);
    var now = nowIso_();
    var created = {
      id: Utilities.getUuid().replace(/-/g, "").slice(0, 24),
      email: email,
      full_name: String(p.full_name || email.split("@")[0]).slice(0, 160),
      role: "user",
      verified: true,
      google_sub: googleSub,
      picture_url: picture,
      created_date: now,
      updated_date: now
    };
    appendRows_(table, [created]);
    return { access_token: createSession_(String(created.id)), user: publicUser_(created) };
  }

  if (byEmail && !isVerified_(byEmail.obj.verified)) {
    throw new HttpError("Confirme primeiro o e-mail da conta existente.", 403);
  }
  if (userRow.obj.google_sub && String(userRow.obj.google_sub) !== googleSub) {
    throw new HttpError("Esta conta já está vinculada a outro login Google.", 409);
  }
  userRow.obj.google_sub = googleSub;
  userRow.obj.verified = true;
  userRow.obj.email = email;
  userRow.obj.full_name = String(p.full_name || userRow.obj.full_name || email.split("@")[0]).slice(0, 160);
  userRow.obj.picture_url = picture;
  userRow.obj.updated_date = nowIso_();
  writeRow_(table, userRow.rowNum, userRow.obj);
  return { access_token: createSession_(String(userRow.obj.id)), user: publicUser_(userRow.obj) };
}

function authLogin_(p) {
  var email = normEmail_(p.email);
  var cache = CacheService.getScriptCache();
  var failKey = "fail:" + email;
  if (Number(cache.get(failKey) || 0) >= MAX_LOGIN_FAILS) {
    throw new HttpError("Muitas tentativas. Aguarde 15 minutos.", 429);
  }
  var u = findUser_(usersTable_(), email);
  var good = u && isVerified_(u.obj.verified) &&
    hashPassword_(String(p.password || ""), String(u.obj.password_salt)) === String(u.obj.password_hash);
  if (!good) {
    cache.put(failKey, String(Number(cache.get(failKey) || 0) + 1), 900);
    throw new HttpError("E-mail ou senha inválidos.", 401);
  }
  cache.remove(failKey);
  return { access_token: createSession_(String(u.obj.id)), user: publicUser_(u.obj) };
}

function authMe_(p) { return requireUser_(p); }

function authRenew_(p) {
  var user = requireUser_(p);
  var token = String(p.access_token || "");
  var hash = sha256hex_(token);
  var table = readTable_(T_SESSIONS, COLS_SESSIONS, null);
  var session = table.rows.filter(function (row) { return row.obj.token_hash === hash; })[0];
  if (!session) throw new HttpError("Sessão inválida ou expirada.", 401);

  var now = Date.now();
  var issuedAt = Date.parse(String(session.obj.issued_at || session.obj.created_date || ""));
  if (!Number.isFinite(issuedAt) || now - issuedAt >= SESSION_MAX_DAYS * 86400000) {
    deleteRowNums_(table, [session.rowNum]);
    throw new HttpError("Sessão expirada. Entre novamente.", 401);
  }

  session.obj.expires_at = now + SESSION_DAYS * 86400000;
  writeRow_(table, session.rowNum, session.obj);
  return { ok: true, user: user, expires_at: session.obj.expires_at };
}

function authLogout_(p) {
  var token = String(p.access_token || "");
  if (token) {
    var hash = sha256hex_(token);
    var t = readTable_(T_SESSIONS, COLS_SESSIONS, null);
    deleteRowNums_(t, t.rows.filter(function (r) { return r.obj.token_hash === hash; }).map(function (r) { return r.rowNum; }));
  }
  return { ok: true };
}

function authResetRequest_(p) {
  var email = normEmail_(p.email);
  var u = findUser_(usersTable_(), email);
  if (u && isVerified_(u.obj.verified)) {
    var token = newToken_();
    saveOtp_(email, "reset", token);
    var configuredBase = String(PropertiesService.getScriptProperties().getProperty("APP_URL") || "").trim();
    var base = configuredBase === "https://datafintech.netlify.app" ||
      configuredBase === "https://datafintech.netlify.app/"
      ? "https://datafintech.netlify.app"
      : "";
    if (configuredBase && !base) Logger.log("APP_URL deve ser https://datafintech.netlify.app.");
    var link = base ? base + "/reset-password?token=" + token : token;
    sendCode_(email, link, "redefinição de senha", base ? "Abra o link para criar uma nova senha:" : "Use este código para redefinir sua senha:");
  }
  return { ok: true }; // sempre igual, para não revelar quais e-mails existem
}

function authResetPassword_(p) {
  var token = String(p.reset_token || "");
  var password = checkPassword_(p.new_password);
  var hash = sha256hex_(token);
  var ot = readTable_(T_OTPS, COLS_OTPS, null);
  var rec = ot.rows.filter(function (r) { return r.obj.purpose === "reset" && r.obj.code_hash === hash; })[0];
  if (!token || !rec || Number(rec.obj.expires_at) < Date.now()) throw new HttpError("Link inválido ou expirado.", 400);
  var t = usersTable_();
  var u = findUser_(t, String(rec.obj.email));
  if (!u) throw new HttpError("Usuário não encontrado.", 404);
  var salt = Utilities.getUuid();
  u.obj.password_salt = salt;
  u.obj.password_hash = hashPassword_(password, salt);
  u.obj.updated_date = nowIso_();
  writeRow_(t, u.rowNum, u.obj);
  deleteRowNums_(ot, [rec.rowNum]);
  var st = readTable_(T_SESSIONS, COLS_SESSIONS, null); // encerra logins antigos
  deleteRowNums_(st, st.rows.filter(function (r) { return String(r.obj.user_id) === String(u.obj.id); }).map(function (r) { return r.rowNum; }));
  return { ok: true, user_id: String(u.obj.id) };
}

// ---------------------------------------------------------------
// Funções para rodar manualmente no editor
// ---------------------------------------------------------------

// Cria todas as abas (uma por entidade + abas internas). Seguro rodar mais de uma vez.
function setupBanco() {
  Object.keys(SCHEMA).forEach(function (entity) { getSheet_(entity, colsOf_(entity), entity); });
  getSheet_(T_USERS, COLS_USERS, null);
  getSheet_(T_SESSIONS, COLS_SESSIONS, null);
  getSheet_(T_OTPS, COLS_OTPS, null);
  getSheet_(T_AUDIT, COLS_AUDIT, null);
  Logger.log("Banco pronto na planilha: " + ss_().getName() + " (" + ss_().getSheets().length + " abas)");
}

// Roda uma vez para o Google pedir a permissão de envio de e-mail.
function autorizar() {
  Logger.log("Envios de e-mail restantes hoje: " + MailApp.getRemainingDailyQuota());
}

// Cria (ou redefine) um usuário administrador sem depender de e-mail.
// Antes: Configurações do projeto > Propriedades do script > adicione
//   ADMIN_EMAIL e ADMIN_SENHA. Depois rode esta função. A senha é apagada ao final.
function criarAdmin() {
  var props = PropertiesService.getScriptProperties();
  var email = normEmail_(props.getProperty("ADMIN_EMAIL"));
  var password = checkPassword_(props.getProperty("ADMIN_SENHA"));
  var t = usersTable_();
  var existing = findUser_(t, email);
  var salt = Utilities.getUuid();
  var now = nowIso_();
  var obj = existing ? existing.obj : {
    id: Utilities.getUuid().replace(/-/g, "").slice(0, 24), email: email, full_name: email.split("@")[0], created_date: now
  };
  obj.role = "admin";
  obj.verified = true;
  obj.password_salt = salt;
  obj.password_hash = hashPassword_(password, salt);
  obj.updated_date = now;
  if (existing) writeRow_(t, existing.rowNum, obj); else appendRows_(t, [obj]);
  props.deleteProperty("ADMIN_SENHA");
  auditEvent_("admin.provision", null, T_USERS, String(obj.id), true);
  Logger.log("Administrador pronto; a propriedade ADMIN_SENHA foi apagada.");
}