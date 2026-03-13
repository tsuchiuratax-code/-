import express from 'express';
import {
  addClient, updateClient, getClient, getAllClients, getActiveClients,
  deactivateClient, activateClient, deleteClient,
  addContact, updateContact, getContacts, deleteContact,
  addHistory, getHistory,
  getLatestRates, getNotificationHistory,
} from './database.js';
import { sendRateChangeNotifications } from './notification.js';

const router = express.Router();

// ========================
// 顧問先 API
// ========================

router.get('/clients', (req, res) => {
  const showAll = req.query.all === '1';
  const clients = showAll ? getAllClients() : getActiveClients();
  res.json(clients);
});

router.get('/clients/:id', (req, res) => {
  const client = getClient(parseInt(req.params.id));
  if (!client) return res.status(404).json({ error: '顧問先が見つかりません' });
  const contacts = getContacts(client.id);
  res.json({ ...client, contacts });
});

router.post('/clients', (req, res) => {
  try {
    const result = addClient(req.body);
    // 主担当連絡先も同時登録
    if (req.body.contact_name && req.body.email) {
      addContact(result.lastInsertRowid, {
        contact_name: req.body.contact_name,
        email: req.body.email,
        is_primary: true,
      });
    }
    addHistory(result.lastInsertRowid, '登録', '顧問先を新規登録');
    res.json({ id: result.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/clients/:id', (req, res) => {
  try {
    updateClient(parseInt(req.params.id), req.body);
    addHistory(parseInt(req.params.id), '更新', '顧問先情報を更新');
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/clients/:id/deactivate', (req, res) => {
  deactivateClient(parseInt(req.params.id));
  addHistory(parseInt(req.params.id), '無効化', '顧問先を無効化');
  res.json({ ok: true });
});

router.post('/clients/:id/activate', (req, res) => {
  activateClient(parseInt(req.params.id));
  addHistory(parseInt(req.params.id), '有効化', '顧問先を有効化');
  res.json({ ok: true });
});

router.delete('/clients/:id', (req, res) => {
  deleteClient(parseInt(req.params.id));
  res.json({ ok: true });
});

// ========================
// 連絡先 API
// ========================

router.get('/clients/:id/contacts', (req, res) => {
  const contacts = getContacts(parseInt(req.params.id));
  res.json(contacts);
});

router.post('/clients/:id/contacts', (req, res) => {
  try {
    const result = addContact(parseInt(req.params.id), req.body);
    res.json({ id: result.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/contacts/:id', (req, res) => {
  try {
    updateContact(parseInt(req.params.id), req.body);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/contacts/:id', (req, res) => {
  deleteContact(parseInt(req.params.id));
  res.json({ ok: true });
});

// ========================
// 対応履歴 API
// ========================

router.get('/clients/:id/history', (req, res) => {
  const history = getHistory(parseInt(req.params.id));
  res.json(history);
});

router.post('/clients/:id/history', (req, res) => {
  try {
    const result = addHistory(
      parseInt(req.params.id),
      req.body.action_type,
      req.body.subject,
      req.body.detail || null
    );
    res.json({ id: result.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ========================
// 保険料率 API
// ========================

router.get('/rates', (req, res) => {
  const rates = getLatestRates(req.query.prefecture || null);
  res.json(rates);
});

// ========================
// 通知 API
// ========================

router.get('/clients/:id/notifications', (req, res) => {
  const logs = getNotificationHistory(parseInt(req.params.id));
  res.json(logs);
});

router.post('/notify', async (req, res) => {
  try {
    const result = await sendRateChangeNotifications();
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
