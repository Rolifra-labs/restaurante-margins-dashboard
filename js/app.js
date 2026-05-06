import { config, getAppwriteClient } from './config.js?v=20260506-2';
import { auth } from './auth.js?v=20260506-2';

class AppManager {
  constructor() {
    this.database = null;
    this.currentRestaurant = null;
    this.dishes = [];
    this.orders = [];
  }

  init() {
    const client = getAppwriteClient();
    if (client) {
      this.database = new window.Appwrite.Databases(client);
    }
  }

  async fetchRestaurant() {
    try {
      const user = await auth.getCurrentUser();
      if (!user) return null;

      const restaurant = await this.database.getDocument(
        'main_db',
        'restaurants',
        user.$id
      );

      this.currentRestaurant = restaurant;
      return restaurant;
    } catch (error) {
      console.error('Error fetching restaurant:', error);
      return null;
    }
  }

  async fetchDishes() {
    try {
      if (!this.currentRestaurant) await this.fetchRestaurant();
      if (!this.currentRestaurant) return [];

      const result = await this.database.listDocuments(
        'main_db',
        'dishes',
        [
          window.Appwrite.Query.equal('restaurant_id', this.currentRestaurant.$id),
          window.Appwrite.Query.limit(config.pageSize)
        ]
      );

      this.dishes = result.documents;
      return this.dishes;
    } catch (error) {
      console.error('Error fetching dishes:', error);
      return [];
    }
  }

  async fetchOrders(days = 30) {
    try {
      if (!this.currentRestaurant) await this.fetchRestaurant();
      if (!this.currentRestaurant) return [];

      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);

      const result = await this.database.listDocuments(
        'main_db',
        'orders',
        [
          window.Appwrite.Query.equal('restaurant_id', this.currentRestaurant.$id),
          window.Appwrite.Query.greaterThanOrEqual('order_date', dateFrom.toISOString()),
          window.Appwrite.Query.limit(config.pageSize),
          window.Appwrite.Query.orderDesc('order_date')
        ]
      );

      this.orders = result.documents;
      return this.orders;
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
  }

  async createDish(dishData) {
    try {
      if (!this.currentRestaurant) await this.fetchRestaurant();
      if (!this.currentRestaurant) throw new Error('Restaurant not loaded');

      // Calculate margin percentage
      const marginPercent = this.calculateMargin(dishData.sale_price, dishData.ingredient_cost);

      const { Permission, Role } = window.Appwrite;
      const userId = this.currentRestaurant.$id;
      const dish = await this.database.createDocument(
        'main_db',
        'dishes',
        window.Appwrite?.ID?.unique() || `dish_${Date.now()}`,
        {
          restaurant_id: this.currentRestaurant.$id,
          name: dishData.name,
          category: dishData.category || '',
          sale_price: parseFloat(dishData.sale_price),
          ingredient_cost: parseFloat(dishData.ingredient_cost),
          margin_percent: marginPercent,
          min_margin_alert: parseFloat(dishData.min_margin_alert) || config.defaultMinMarginAlert,
          is_active: true,
          created_at: new Date().toISOString()
        },
        [
          Permission.read(Role.user(userId)),
          Permission.update(Role.user(userId)),
          Permission.delete(Role.user(userId))
        ]
      );

      this.dishes.push(dish);
      return dish;
    } catch (error) {
      console.error('Error creating dish:', error);
      throw new Error(error.message || 'Failed to create dish');
    }
  }

  async updateDish(dishId, dishData) {
    try {
      const marginPercent = this.calculateMargin(dishData.sale_price, dishData.ingredient_cost);

      const updated = await this.database.updateDocument(
        'main_db',
        'dishes',
        dishId,
        {
          name: dishData.name,
          category: dishData.category || '',
          sale_price: parseFloat(dishData.sale_price),
          ingredient_cost: parseFloat(dishData.ingredient_cost),
          margin_percent: marginPercent,
          min_margin_alert: parseFloat(dishData.min_margin_alert) || config.defaultMinMarginAlert
        }
      );

      const index = this.dishes.findIndex(d => d.$id === dishId);
      if (index !== -1) this.dishes[index] = updated;

      return updated;
    } catch (error) {
      console.error('Error updating dish:', error);
      throw new Error(error.message || 'Failed to update dish');
    }
  }

  async deleteDish(dishId) {
    try {
      await this.database.deleteDocument('main_db', 'dishes', dishId);
      this.dishes = this.dishes.filter(d => d.$id !== dishId);
      return true;
    } catch (error) {
      console.error('Error deleting dish:', error);
      throw new Error(error.message || 'Failed to delete dish');
    }
  }

  calculateMargin(salePrice, cost) {
    const sale = parseFloat(salePrice);
    const ingredientCost = parseFloat(cost);

    if (sale <= 0 || ingredientCost >= sale) return 0;

    return ((sale - ingredientCost) / sale * 100);
  }

  // KPI calculations
  getAverageMargin() {
    if (this.dishes.length === 0) return 0;
    const sum = this.dishes.reduce((acc, dish) => acc + (dish.margin_percent || 0), 0);
    return (sum / this.dishes.length).toFixed(1);
  }

  getOrdersToday() {
    const today = new Date().toDateString();
    return this.orders.filter(order => {
      const orderDate = new Date(order.order_date).toDateString();
      return orderDate === today;
    }).length;
  }

  getRevenueToday() {
    const today = new Date().toDateString();
    return this.orders
      .filter(order => {
        const orderDate = new Date(order.order_date).toDateString();
        return orderDate === today;
      })
      .reduce((acc, order) => acc + (order.sale_price || 0), 0)
      .toFixed(2);
  }

  getActiveDishes() {
    return this.dishes.filter(d => d.is_active).length;
  }

  // Chart data
  getMarginChartData() {
    return {
      labels: this.dishes.map(d => d.name),
      datasets: [{
        label: 'Margen %',
        data: this.dishes.map(d => d.margin_percent || 0),
        backgroundColor: this.dishes.map(d => d.margin_percent >= config.defaultMinMarginAlert ? '#10b981' : '#ef4444')
      }]
    };
  }

  getSalesChartData() {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      last7Days.push(date);
    }

    const salesByDay = last7Days.map(day => {
      const dayStr = day.toDateString();
      const daySales = this.orders
        .filter(order => new Date(order.order_date).toDateString() === dayStr)
        .reduce((acc, order) => acc + (order.sale_price || 0), 0);
      return daySales;
    });

    return {
      labels: last7Days.map(d => d.toLocaleDateString('es-ES', { weekday: 'short' })),
      datasets: [{
        label: 'Ventas €',
        data: salesByDay,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true
      }]
    };
  }

  async recordOrder(orderData) {
    try {
      if (!this.currentRestaurant) await this.fetchRestaurant();

      const dish = this.dishes.find(d => d.$id === orderData.dish_id);
      if (!dish) throw new Error('Dish not found');

      const cost = dish.ingredient_cost * orderData.quantity;
      const margin = orderData.sale_price - cost;
      const marginPercent = (margin / orderData.sale_price) * 100;

      const { Permission, Role } = window.Appwrite;
      const userId = this.currentRestaurant.$id;
      const order = await this.database.createDocument(
        'main_db',
        'orders',
        window.Appwrite?.ID?.unique() || `order_${Date.now()}`,
        {
          restaurant_id: this.currentRestaurant.$id,
          dish_id: orderData.dish_id,
          platform: orderData.platform || 'manual',
          quantity: parseInt(orderData.quantity),
          sale_price: parseFloat(orderData.sale_price),
          cost: cost,
          margin: margin,
          margin_percent: marginPercent,
          order_date: new Date().toISOString()
        },
        [
          Permission.read(Role.user(userId)),
          Permission.update(Role.user(userId)),
          Permission.delete(Role.user(userId))
        ]
      );

      this.orders.unshift(order);

      // Check if margin is low
      if (marginPercent < dish.min_margin_alert) {
        await this.sendLowMarginAlert(dish, marginPercent);
      }

      return order;
    } catch (error) {
      console.error('Error recording order:', error);
      throw new Error(error.message || 'Failed to record order');
    }
  }

  async sendLowMarginAlert(dish, marginPercent) {
    try {
      // This would call n8n webhook to send alert
      const webhookUrl = config.n8nWebhookUrl;
      if (!webhookUrl || webhookUrl.includes('WEBHOOK')) return; // Skip if not configured

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert_type: 'low_margin',
          dish_id: dish.$id,
          dish_name: dish.name,
          margin_percent: marginPercent,
          threshold: dish.min_margin_alert
        })
      });
    } catch (error) {
      console.error('Error sending alert:', error);
      // Don't throw - alert sending shouldn't fail the order
    }
  }
}

export const app = new AppManager();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}
