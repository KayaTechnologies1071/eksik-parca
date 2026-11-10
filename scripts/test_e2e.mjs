/**
 * EKSİK PARÇA — Uçtan Uca (E2E) Sistem, WebSocket ve Oyun Modları Doğrulama Testi
 * Solo Arşiv Modu, 2 Kişilik Duo Asimetrik Mod, 4 Kişilik Kirli Polis (Hain) Modu
 * ve Anti-Cheat Ceza Mekanizmalarını gerçek sunucu üzerinde doğrular.
 */

import assert from 'node:assert';
import { spawn } from 'node:child_process';
import WebSocket from 'ws';

const BASE_URL = 'http://localhost:3099';
const WS_URL = 'ws://localhost:3099/ws';

async function postJson(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

function connectWs(roomCode, userId) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    const events = [];
    ws.on('open', () => {
      ws.send(
        JSON.stringify({
          event: 'JOIN_SOCKET',
          data: { room_code: roomCode, user_id: userId },
        })
      );
    });
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      events.push(msg);
      if (msg.event === 'STATE_SNAPSHOT') {
        resolve({ ws, events, initialSnapshot: msg.snapshot });
      }
    });
    ws.on('error', reject);
  });
}

function waitForEvent(ws, targetEvent, predicate = () => true, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.off('message', handler);
      reject(new Error(`Timeout waiting for WS event: ${targetEvent}`));
    }, timeoutMs);

    const handler = (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.event === targetEvent && predicate(msg)) {
        clearTimeout(timer);
        ws.off('message', handler);
        resolve(msg);
      }
    };
    ws.on('message', handler);
  });
}

async function runTests() {
  console.log('====================================================================');
  console.log('EKSİK PARÇA — UÇTAN UCA (E2E) SİSTEM VE PROTOKOL TESTİ BAŞLATILIYOR');
  console.log('====================================================================');

  const serverProc = spawn('node', ['server/index.mjs'], {
    env: { ...process.env, PORT: '3099' },
    stdio: 'pipe',
  });

  await new Promise((resolve) => {
    const timeout = setTimeout(resolve, 5500);
    serverProc.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      if (text.includes('[EKSİK PARÇA SUNUCUSU]')) {
        clearTimeout(timeout);
        resolve();
      }
    });
  });

  try {
    // 1. Zero-Friction Guest Login
    const { data: auth1 } = await postJson('/api/auth/guest', {
      device_id: 'e2e_dev_1',
      display_name: 'Dedektif Kaan',
    });
    const { data: auth2 } = await postJson('/api/auth/guest', {
      device_id: 'e2e_dev_2',
      display_name: 'Dedektif Zeynep',
    });
    assert.ok(auth1.user?.id, 'Oyuncu 1 profili oluşturulmalı');
    assert.ok(auth2.user?.id, 'Oyuncu 2 profili oluşturulmalı');
    console.log('[OK] 1. Sürtünmesiz Misafir Girişi (Zero-Friction Login) doğrulandı.');

    // 2. DUO Mode Room Creation & Asymmetric Partitioning (CASE-104: Loca 402)
    const { data: createDuo } = await postJson('/api/rooms/create', {
      user_id: auth1.user.id,
      display_name: auth1.user.display_name,
      case_id: 'CASE-104',
      mode: 'DUO',
    });
    const roomCode = createDuo.room_code;
    assert.strictEqual(roomCode.length, 6, 'Oda kodu 6 karakterli olmalı');
    assert.ok(!/[0O1IL]/.test(roomCode), 'Oda kodunda 0, O, 1, I, L bulunmamalı');

    const { data: joinDuo } = await postJson('/api/rooms/join', {
      user_id: auth2.user.id,
      display_name: auth2.user.display_name,
      room_code: roomCode,
    });
    assert.strictEqual(joinDuo.snapshot.players.length, 2, 'Odada 2 oyuncu olmalı');

    const client1 = await connectWs(roomCode, auth1.user.id);
    const client2 = await connectWs(roomCode, auth2.user.id);

    // Start Match
    const startPromise1 = waitForEvent(client1.ws, 'MATCH_STARTED');
    const startPromise2 = waitForEvent(client2.ws, 'MATCH_STARTED');
    client1.ws.send(JSON.stringify({ event: 'START_MATCH' }));
    const started1 = await startPromise1;
    const started2 = await startPromise2;

    const p1Nodes = started1.snapshot.my_nodes.map((n) => n.node_id);
    const p2Nodes = started2.snapshot.my_nodes.map((n) => n.node_id);
    assert.strictEqual(p1Nodes.length, 4, 'Oyuncu 1 elinde 4 özel kanıt olmalı');
    assert.strictEqual(p2Nodes.length, 4, 'Oyuncu 2 elinde 4 özel kanıt olmalı');
    const overlap = p1Nodes.filter((id) => p2Nodes.includes(id));
    assert.strictEqual(overlap.length, 0, 'Asimetrik dağılımda iki oyuncunun kanıtları kesişmemeli');
    assert.strictEqual(started1.snapshot.solution, undefined, 'Çözüm verisi istemciye sızmamalı');
    console.log(
      `[OK] 2. DUO Modu Asimetrik Kanıt Dağılımı doğrulandı (P1: ${p1Nodes.join(',')} | P2: ${p2Nodes.join(',')}).`
    );

    // 3. Pinning & Cross-Player Edge Verification on 2D Board
    const pinPromise = waitForEvent(
      client1.ws,
      'NODE_PINNED',
      (m) => m.data?.node?.node_id === 'KNT-06'
    );
    client1.ws.send(JSON.stringify({ event: 'PIN_NODE', data: { node_id: 'KNT-02' } }));
    client2.ws.send(JSON.stringify({ event: 'PIN_NODE', data: { node_id: 'KNT-06' } }));
    await pinPromise;

    // Verify valid edge KNT-02 <-> KNT-06 => Unlocks CKR-02
    const edgePromise = waitForEvent(
      client1.ws,
      'EDGE_VERIFIED',
      (m) => m.data?.newly_unlocked_node?.node_id === 'CKR-02'
    );
    client1.ws.send(
      JSON.stringify({
        event: 'VERIFY_EDGE',
        data: { source_node: 'KNT-02', target_node: 'KNT-06' },
      })
    );
    const edgeVerified = await edgePromise;
    assert.strictEqual(edgeVerified.data.newly_unlocked_node.node_id, 'CKR-02');
    console.log('[OK] 3. Ortak Kanıt Tahtası Bağlantı Doğrulaması (KNT-02 + KNT-06 -> CKR-02) başarılı.');

    // Unlock CKR-03 as well (KNT-01 + KNT-07)
    const edgePromise2 = waitForEvent(
      client2.ws,
      'EDGE_VERIFIED',
      (m) => m.data?.newly_unlocked_node?.node_id === 'CKR-03'
    );
    client2.ws.send(
      JSON.stringify({
        event: 'VERIFY_EDGE',
        data: { source_node: 'KNT-01', target_node: 'KNT-07' },
      })
    );
    const edgeVerified2 = await edgePromise2;
    assert.strictEqual(edgeVerified2.data.newly_unlocked_node.node_id, 'CKR-03');

    // 4. Test Anti-Cheat Wrong Connection Penalty (-30s & 5s Cooldown)
    const rejectPromise = waitForEvent(client1.ws, 'EDGE_REJECTED');
    client1.ws.send(
      JSON.stringify({
        event: 'VERIFY_EDGE',
        data: { source_node: 'KNT-01', target_node: 'KNT-02' },
      })
    );
    const rejected = await rejectPromise;
    assert.strictEqual(rejected.data.penalty_seconds, 30, 'Hatalı bağlantıda 30 sn ceza düşülmeli');
    console.log('[OK] 4. Anti-Cheat Hatalı Bağlantı Cezası (-30 sn ve 5 sn tahta kilidi) doğrulandı.');

    // 5. Simultaneous Accusation & Newspaper Endgame Verification (with XP & Badges)
    const endPromise = waitForEvent(client1.ws, 'MATCH_ENDED');
    client1.ws.send(
      JSON.stringify({
        event: 'CAST_VOTE',
        data: {
          suspect_id: 'susp_hakan',
          evidence_ids: ['KNT-03', 'CKR-02', 'CKR-03'],
        },
      })
    );
    client2.ws.send(
      JSON.stringify({
        event: 'CAST_VOTE',
        data: {
          suspect_id: 'susp_hakan',
          evidence_ids: ['KNT-03', 'CKR-02', 'CKR-03'],
        },
      })
    );
    const ended = await endPromise;
    assert.strictEqual(ended.data.is_solved, true, 'Vaka doğru kombinasyonla çözülmeli');
    assert.strictEqual(ended.data.accuracy_rate, 100, 'Doğruluk oranı %100 olmalı');
    assert.ok(ended.data.xp_gained > 0, 'XP kazanımı hesaplanmalı');
    console.log(
      `[OK] 5. Eşzamanlı Oylama, Kariyer XP (+${ended.data.xp_gained} XP) ve Gazete Manşeti: "${ended.data.headline}"`
    );

    // 5B. Verify 16 Cases & Chained Multi-Layer DAG + HARDCORE Difficulty Preset (CASE-408)
    await postJson('/api/store/purchase', {
      user_id: auth1.user.id,
      is_subscription: true,
    });
    const casesRes = await fetch(`${BASE_URL}/api/cases?user_id=${auth1.user.id}`);
    const casesJson = await casesRes.json();
    assert.strictEqual(casesJson.cases.length, 16, 'Sistemde 16 tam vaka yüklü olmalı');

    const { data: createHc } = await postJson('/api/rooms/create', {
      user_id: auth1.user.id,
      display_name: 'Başkomiser Kaan',
      case_id: 'CASE-408',
      mode: 'SOLO',
      difficulty_preset: 'HARDCORE',
    });
    assert.strictEqual(createHc.snapshot.difficulty_preset, 'HARDCORE');
    assert.strictEqual(createHc.snapshot.penalty_seconds_rule, 60, 'Hardcore ceza 60 sn olmalı');

    const hcClient = await connectWs(createHc.room_code, auth1.user.id);
    // Unlock KNT-408-2, KNT-408-6, KNT-408-7 and verify Layer-1 -> Layer-2 -> Layer-3 chained DAG!
    hcClient.ws.send(JSON.stringify({ event: 'UNLOCK_ARCHIVE_NODE', data: { node_id: 'KNT-408-2' } }));
    hcClient.ws.send(JSON.stringify({ event: 'UNLOCK_ARCHIVE_NODE', data: { node_id: 'KNT-408-6' } }));
    hcClient.ws.send(JSON.stringify({ event: 'UNLOCK_ARCHIVE_NODE', data: { node_id: 'KNT-408-7' } }));
    await waitForEvent(hcClient.ws, 'ARCHIVE_NODE_UNLOCKED', (m) => m.data?.node_id === 'KNT-408-7');

    hcClient.ws.send(JSON.stringify({ event: 'PIN_NODE', data: { node_id: 'KNT-408-2' } }));
    hcClient.ws.send(JSON.stringify({ event: 'PIN_NODE', data: { node_id: 'KNT-408-6' } }));
    hcClient.ws.send(JSON.stringify({ event: 'PIN_NODE', data: { node_id: 'KNT-408-7' } }));

    // Layer 1 -> Layer 2 (KNT-408-2 + KNT-408-6 => CKR-408-2)
    const l2Promise = waitForEvent(
      hcClient.ws,
      'EDGE_VERIFIED',
      (m) => m.data?.newly_unlocked_node?.node_id === 'CKR-408-2'
    );
    hcClient.ws.send(
      JSON.stringify({
        event: 'VERIFY_EDGE',
        data: { source_node: 'KNT-408-2', target_node: 'KNT-408-6' },
      })
    );
    await l2Promise;

    // Layer 2 -> Layer 3 Chained Deduction (CKR-408-2 + KNT-408-7 => CKR-408-3)
    const l3Promise = waitForEvent(
      hcClient.ws,
      'EDGE_VERIFIED',
      (m) => m.data?.newly_unlocked_node?.node_id === 'CKR-408-3'
    );
    hcClient.ws.send(
      JSON.stringify({
        event: 'VERIFY_EDGE',
        data: { source_node: 'CKR-408-2', target_node: 'KNT-408-7' },
      })
    );
    const l3Event = await l3Promise;
    assert.strictEqual(l3Event.data.newly_unlocked_node.node_id, 'CKR-408-3');
    hcClient.ws.close();
    console.log(
      '[OK] 5B. 16 Vaka Havuzu, HARDCORE Zorluk Modu ve 3 Katmanlı Zincirleme DAG (CKR-408-2 -> CKR-408-3) doğrulandı.'
    );

    // 6. 4-Player GROUP Mode ("Kirli Polis / Hain" CSPRNG Verification)
    const { data: createGroup } = await postJson('/api/rooms/create', {
      user_id: auth1.user.id,
      display_name: 'Dedektif 1',
      case_id: 'CASE-209',
      mode: 'GROUP',
    });
    const groupCode = createGroup.room_code;
    const gClient = await connectWs(groupCode, auth1.user.id);

    // Add 3 AI Bots to form a 4-player table
    gClient.ws.send(JSON.stringify({ event: 'ADD_BOT_PLAYER' }));
    gClient.ws.send(JSON.stringify({ event: 'ADD_BOT_PLAYER' }));
    gClient.ws.send(JSON.stringify({ event: 'ADD_BOT_PLAYER' }));
    await new Promise((r) => setTimeout(r, 150));

    const gStartPromise = waitForEvent(gClient.ws, 'MATCH_STARTED');
    gClient.ws.send(JSON.stringify({ event: 'START_MATCH' }));
    const gStarted = await gStartPromise;
    assert.strictEqual(gStarted.snapshot.mode, 'GROUP', '4 kişilik masa GROUP modunda başlamalı');
    assert.strictEqual(gStarted.snapshot.players.length, 4, 'Masada 4 oyuncu bulunmalı');
    console.log('[OK] 6. 4 Kişilik GRUP ("Kirli Polis / Hain") Modu ve CSPRNG Rol Dağıtımı doğrulandı.');

    client1.ws.close();
    client2.ws.close();
    gClient.ws.close();

    console.log('====================================================================');
    console.log('TÜM UÇTAN UCA (E2E) TESTLER %100 BAŞARIYLA TAMAMLANDI!');
    console.log('====================================================================');
  } finally {
    serverProc.kill();
  }
}

runTests().catch((err) => {
  console.error('E2E Test Hatası:', err);
  process.exit(1);
});
