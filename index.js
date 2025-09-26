const axios = require('axios');
const OpenAI = require('openai');
// const nodemailer = require('nodemailer'); // demo only, oxi energo tora
require('dotenv').config();

/**
  Fernei paraggelies apo WooCommerce twn teleftaiwn 30 hmerwn
  - REST API call sto /orders endpoint
  - Basic Auth me key/secret
  - Periorizei se 50 apotelesmata (demo)
 */
async function fetchOrders() {
  try {
    const url = `${process.env.SHOP_URL}/wp-json/wc/v3/orders`;
    const res = await axios.get(url, {
      auth: {
        username: process.env.WC_KEY,
        password: process.env.WC_SECRET,
      },
      params: {
        per_page: 50,
        after: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });
    return res.data;
  } catch (err) {
    console.error('❌ Sfalma sto fetchOrders:', err.message);
    throw err;
  }
}

/**
  Pairei oles tis paraggelies kai ypologizei sunolikes pwliseis ana proion
  - key = onoma proiontos
  - value = sunolo temaxiwn
 */
function summarizeProducts(orders) {
  try {
    const stats = {};
    for (const order of orders) {
      for (const item of order.line_items) {
        stats[item.name] = (stats[item.name] || 0) + item.quantity;
      }
    }
    return stats;
  } catch (err) {
    console.error('❌ Sfalma sto summarizeProducts:', err.message);
    return {};
  }
}

/**
  Ypologizei vasika stoixeia pelatwn apo tis paraggelies
  - Orders count ana pelati
  - Sunolika xrimata pou xodepse
 */
function summarizeCustomers(orders) {
  try {
    const customers = {};
    for (const order of orders) {
      const email = order.billing?.email || 'unknown';
      if (!customers[email]) {
        customers[email] = { ordersCount: 0, totalSpent: 0 };
      }
      customers[email].ordersCount++;
      customers[email].totalSpent += parseFloat(order.total || 0);
    }
    return customers;
  } catch (err) {
    console.error('❌ Sfalma sto summarizeCustomers:', err.message);
    return {};
  }
}

/**
  Zitaei apo OpenAI insights panw stis pwliseis proiontwn
  Input: statistika {product: qty}
  Output: 2-3 praktikes proseggiseis sta ellinika
 */
async function generateInsights(stats) {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const productList = Object.entries(stats)
      .map(([name, qty]) => `${name}: ${qty} pwliseis`)
      .join('\n');

    const prompt = `
Είσαι AI βοηθός e-commerce.
Διάβασε συνοπτικά τα προϊόντα από τις παραγγελίες:
${productList}

Δώσε 2-3 πρακτικές προσεγγίσεις στα ελληνικά.
`;


    const res = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [{ role: 'user', content: prompt }],
    });

    return res.choices[0].message.content.trim();
  } catch (err) {
    console.error('❌ Sfalma sto generateInsights:', err.message);
    return '⚠️ Den itan dynati i dimiourgia AI proseggiseon.';
  }
}

/**
  Kyria roi (demo runner)
  - Fortwsi paraggelion
  - Ypologismos statistikon
  - Analysi pelatwn
  - Klisi AI gia proseggiseis
 */
(async () => {
  try {
    console.log('📡 Fortwsi paraggelion...');
    const orders = await fetchOrders();

    if (!orders || orders.length === 0) {
      console.warn('⚠️ Den vrethikan paraggelies.');
      return;
    }

    console.log('📦 Paraggelies:', orders.length);

    const stats = summarizeProducts(orders);
    console.log('📈 Statistika:', stats);

    const customers = summarizeCustomers(orders);
    console.log('👥 Pelates:', customers);

    const insights = await generateInsights(stats);
    console.log('🧠 AI Proseggiseis:', insights);

  } catch (err) {
    console.error('❌ Sfalma sti main roi:', err.message);
  }
})();


