/**
 * Rellena main_db con platos y pedidos de ejemplo para un restaurante existente.
 *
 * Requisitos en Appwrite:
 * - API Key de servidor con permisos de escritura en Databases.
 * - Colecciones: dishes, orders (y restaurants ya con doc del usuario).
 *
 * Variables de entorno:
 *   APPWRITE_ENDPOINT   (por defecto https://backend.rolifra.com/v1)
 *   APPWRITE_PROJECT_ID
 *   APPWRITE_API_KEY
 *   SEED_USER_ID        = $id del usuario Auth (mismo que documentId del restaurante)
 *
 * Uso:
 *   npm install
 *   npm run seed:main-db
 *
 * Opciones:
 *   --force   Inserta datos de demo aunque ya existan platos para ese restaurante.
 */

import { Client, Databases, ID, Permission, Query, Role } from 'node-appwrite';

const DATABASE_ID = 'main_db';

function marginPercent(sale, cost) {
  const s = Number(sale);
  const c = Number(cost);
  if (s <= 0 || c >= s) return 0;
  return ((s - c) / s) * 100;
}

function env(name, fallback = '') {
  const v = process.env[name];
  return v && String(v).trim() ? String(v).trim() : fallback;
}

async function main() {
  const endpoint = env('APPWRITE_ENDPOINT', 'https://backend.rolifra.com/v1').replace(/\/+$/, '');
  const projectId = env('APPWRITE_PROJECT_ID');
  const apiKey = env('APPWRITE_API_KEY');
  const userId = env('SEED_USER_ID');
  const force = process.argv.includes('--force');

  if (!projectId || !apiKey || !userId) {
    console.error('Faltan APPWRITE_PROJECT_ID, APPWRITE_API_KEY o SEED_USER_ID.');
    process.exit(1);
  }

  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  const db = new Databases(client);

  const userPerms = [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ];

  let existing;
  try {
    existing = await db.listDocuments(DATABASE_ID, 'dishes', [
      Query.equal('restaurant_id', userId),
      Query.limit(1),
    ]);
  } catch (e) {
    console.error('No se pudo listar platos:', e.message || e);
    process.exit(1);
  }

  if (existing.total > 0 && !force) {
    console.log(
      `Ya hay platos para restaurant_id=${userId}. Usa --force para insertar datos demo igualmente.`
    );
    process.exit(0);
  }

  const samples = [
    { name: 'Pizza Margarita', category: 'Pizzas', sale_price: 12, ingredient_cost: 3.5, min_margin_alert: 15 },
    { name: 'Pasta Carbonara', category: 'Pastas', sale_price: 14, ingredient_cost: 4.2, min_margin_alert: 15 },
    { name: 'Ensalada César', category: 'Ensaladas', sale_price: 9.5, ingredient_cost: 2.8, min_margin_alert: 15 },
    { name: 'Hamburguesa Gourmet', category: 'Principales', sale_price: 11, ingredient_cost: 4.5, min_margin_alert: 15 },
    { name: 'Tarta de Queso', category: 'Postres', sale_price: 6.5, ingredient_cost: 2.1, min_margin_alert: 15 },
  ];

  const dishIds = [];
  const now = new Date();

  for (const row of samples) {
    const mp = marginPercent(row.sale_price, row.ingredient_cost);
    const doc = await db.createDocument(DATABASE_ID, 'dishes', ID.unique(), {
      restaurant_id: userId,
      name: row.name,
      category: row.category,
      sale_price: row.sale_price,
      ingredient_cost: row.ingredient_cost,
      margin_percent: mp,
      min_margin_alert: row.min_margin_alert,
      is_active: true,
      created_at: now.toISOString(),
    }, userPerms);
    dishIds.push(doc.$id);
    console.log('Plato creado:', doc.name, doc.$id);
  }

  // Pedidos demo repartidos en los últimos días (para gráfico de ventas)
  const platforms = ['manual', 'uber_eats', 'glovo'];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - (i % 7));
    const dishId = dishIds[i % dishIds.length];
    const dishMeta = samples[i % samples.length];
    const qty = (i % 3) + 1;
    const sale = dishMeta.sale_price * qty;
    const cost = dishMeta.ingredient_cost * qty;
    const margin = sale - cost;
    const mp = sale > 0 ? (margin / sale) * 100 : 0;

    await db.createDocument(DATABASE_ID, 'orders', ID.unique(), {
      restaurant_id: userId,
      dish_id: dishId,
      platform: platforms[i % platforms.length],
      quantity: qty,
      sale_price: sale,
      cost,
      margin,
      margin_percent: mp,
      order_date: d.toISOString(),
    }, userPerms);
  }

  console.log('Listo: platos y pedidos demo insertados en', DATABASE_ID, 'para usuario', userId);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
