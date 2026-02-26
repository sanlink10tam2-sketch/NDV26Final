import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Supabase Status check for Admin
app.get("/api/supabase-status", async (req, res) => {
  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return res.json({ 
        connected: false, 
        error: "Thiếu cấu hình SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY" 
      });
    }
    
    const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
    
    if (error) {
      return res.json({ 
        connected: false, 
        error: `Lỗi kết nối Supabase: ${error.message} (${error.code})` 
      });
    }
    
    res.json({ connected: true, message: "Kết nối Supabase ổn định" });
  } catch (e: any) {
    res.json({ connected: false, error: `Lỗi hệ thống: ${e.message}` });
  }
});

// API Routes
app.get("/api/data", async (req, res) => {
  try {
    const { data: users } = await supabase.from('users').select('*');
    const { data: loans } = await supabase.from('loans').select('*');
    const { data: notifications } = await supabase.from('notifications').select('*');
    const { data: config } = await supabase.from('config').select('*');

    const budget = config?.find(c => c.key === 'budget')?.value || 30000000;
    const rankProfit = config?.find(c => c.key === 'rankProfit')?.value || 0;

    res.json({
      users: users || [],
      loans: loans || [],
      notifications: notifications || [],
      budget,
      rankProfit
    });
  } catch (e) {
    console.error("Lỗi trong /api/data:", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/users", async (req, res) => {
  try {
    const incomingUsers = req.body;
    if (!Array.isArray(incomingUsers)) {
      return res.status(400).json({ error: "Dữ liệu phải là mảng" });
    }

    for (const user of incomingUsers) {
      const { error } = await supabase.from('users').upsert(user, { onConflict: 'id' });
      if (error) console.error(`Lỗi upsert user ${user.id}:`, error);
    }
    
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/loans", async (req, res) => {
  try {
    const incomingLoans = req.body;
    if (!Array.isArray(incomingLoans)) {
      return res.status(400).json({ error: "Dữ liệu phải là mảng" });
    }

    for (const loan of incomingLoans) {
      const { error } = await supabase.from('loans').upsert(loan, { onConflict: 'id' });
      if (error) console.error(`Lỗi upsert loan ${loan.id}:`, error);
    }
    
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/notifications", async (req, res) => {
  try {
    const incomingNotifs = req.body;
    if (!Array.isArray(incomingNotifs)) {
      return res.status(400).json({ error: "Dữ liệu phải là mảng" });
    }

    for (const notif of incomingNotifs) {
      const { error } = await supabase.from('notifications').upsert(notif, { onConflict: 'id' });
      if (error) console.error(`Lỗi upsert notification ${notif.id}:`, error);
    }
    
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/budget", async (req, res) => {
  try {
    const { budget } = req.body;
    await supabase.from('config').upsert({ key: 'budget', value: budget }, { onConflict: 'key' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/rankProfit", async (req, res) => {
  try {
    const { rankProfit } = req.body;
    await supabase.from('config').upsert({ key: 'rankProfit', value: rankProfit }, { onConflict: 'key' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.delete("/api/users/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    await supabase.from('users').delete().eq('id', userId);
    await supabase.from('loans').delete().eq('userId', userId);
    await supabase.from('notifications').delete().eq('userId', userId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default app;
