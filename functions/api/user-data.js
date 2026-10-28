/**
 * Cloudflare Pages Function: /api/user-data
 * 作用：與 Cloudflare D1 邊緣資料庫連動，達成「免手動匯出，多裝置 (家裡/公司/手機) 自動即時同步」
 * 包含：自選持股倉、鎖單股、損益成本、交易日誌、券商設定、以及更新後的安全授權碼 (PIN)
 */

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const userId = (url.searchParams.get('userId') || url.searchParams.get('email') || 'main_admin').trim().toLowerCase();

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Email',
    'Content-Type': 'application/json; charset=utf-8'
  };

  // 檢查 Cloudflare Pages 是否已綁定 D1 (變數名稱須為 DB)
  if (!env.DB) {
    return new Response(JSON.stringify({
      success: false,
      error: 'D1_NOT_BOUND',
      message: 'Cloudflare Pages 尚未綁定 D1 資料庫 (變數名稱須為 DB)。請至 Cloudflare 控制台 Pages 設定中加入 D1 綁定。'
    }), { status: 200, headers });
  }

  try {
    // 自動確保資料表存在 (首次讀取時自動建表，零手動痛苦)
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS user_portfolios (
        user_id TEXT PRIMARY KEY,
        stocks_json TEXT NOT NULL,
        trades_json TEXT NOT NULL,
        broker_json TEXT,
        security_json TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // 查詢該使用者資料（支援特定 Google Email 或主要管理員 main_admin）
    let row = await env.DB.prepare(
      'SELECT user_id, stocks_json, trades_json, broker_json, security_json, updated_at FROM user_portfolios WHERE user_id = ?'
    ).bind(userId).first();

    // 若用 email 查無資料，嘗試退回 main_admin 查詢通用紀錄
    if (!row && userId !== 'main_admin') {
      row = await env.DB.prepare(
        'SELECT user_id, stocks_json, trades_json, broker_json, security_json, updated_at FROM user_portfolios WHERE user_id = ?'
      ).bind('main_admin').first();
    }

    if (!row) {
      return new Response(JSON.stringify({
        success: true,
        found: false,
        message: '目前雲端尚無存檔紀錄 (首次連線)'
      }), { status: 200, headers });
    }

    return new Response(JSON.stringify({
      success: true,
      found: true,
      data: {
        userId: row.user_id,
        stocks: row.stocks_json ? JSON.parse(row.stocks_json) : [],
        trades: row.trades_json ? JSON.parse(row.trades_json) : [],
        broker: row.broker_json ? JSON.parse(row.broker_json) : null,
        security: row.security_json ? JSON.parse(row.security_json) : null,
        updatedAt: row.updated_at
      }
    }), { status: 200, headers });

  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: err.message
    }), { status: 500, headers });
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Email',
    'Content-Type': 'application/json; charset=utf-8'
  };

  if (!env.DB) {
    return new Response(JSON.stringify({
      success: false,
      error: 'D1_NOT_BOUND',
      message: 'Cloudflare Pages 尚未綁定 D1 資料庫 (變數名稱須為 DB)。'
    }), { status: 200, headers });
  }

  try {
    const payload = await request.json();
    const userId = (payload.userId || payload.email || 'main_admin').trim().toLowerCase();

    const stocksJson = JSON.stringify(payload.stocks || []);
    const tradesJson = JSON.stringify(payload.trades || []);
    const brokerJson = payload.broker ? JSON.stringify(payload.broker) : null;
    const securityJson = payload.security ? JSON.stringify(payload.security) : null;

    // 自動建表防禦
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS user_portfolios (
        user_id TEXT PRIMARY KEY,
        stocks_json TEXT NOT NULL,
        trades_json TEXT NOT NULL,
        broker_json TEXT,
        security_json TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // 寫入/更新使用者資料 (UPSERT)
    await env.DB.prepare(`
      INSERT INTO user_portfolios (user_id, stocks_json, trades_json, broker_json, security_json, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        stocks_json = excluded.stocks_json,
        trades_json = excluded.trades_json,
        broker_json = excluded.broker_json,
        security_json = excluded.security_json,
        updated_at = datetime('now')
    `).bind(userId, stocksJson, tradesJson, brokerJson, securityJson).run();

    // 如果使用者有傳入特定的 Google Email，同時鏡像更新至 'main_admin' 確保跨電腦 PIN 登入也能即時抓到
    if (userId !== 'main_admin') {
      try {
        await env.DB.prepare(`
          INSERT INTO user_portfolios (user_id, stocks_json, trades_json, broker_json, security_json, updated_at)
          VALUES ('main_admin', ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(user_id) DO UPDATE SET
            stocks_json = excluded.stocks_json,
            trades_json = excluded.trades_json,
            broker_json = excluded.broker_json,
            security_json = excluded.security_json,
            updated_at = datetime('now')
        `).bind(stocksJson, tradesJson, brokerJson, securityJson).run();
      } catch (e) {}
    }

    return new Response(JSON.stringify({
      success: true,
      message: '🎉 成功同步儲存至 Cloudflare D1 雲端資料庫！',
      updatedAt: new Date().toISOString()
    }), { status: 200, headers });

  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: err.message
    }), { status: 500, headers });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Email'
    }
  });
}
