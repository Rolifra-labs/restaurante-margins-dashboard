import { config, getAppwriteClient } from './config.js';

class AuthManager {
  constructor() {
    this.account = null;
    this.database = null;
    this.users = null;
    this.currentUser = null;
  }

  init() {
    const client = getAppwriteClient();
    if (client) {
      this.account = new window.Appwrite.Account(client);
      this.database = new window.Appwrite.Databases(client);
      this.users = new window.Appwrite.Users(client);
    }
  }

  async getCurrentUser() {
    try {
      const session = await this.account.get();
      if (session) {
        // Fetch restaurant data
        const restaurant = await this.getRestaurant(session.$id);
        this.currentUser = { ...session, restaurant };
        return this.currentUser;
      }
    } catch (error) {
      console.log('No active session');
      return null;
    }
  }

  async registerRestaurant(restaurantName, email, password, phone) {
    try {
      // Create user account
      const userId = window.ID?.unique() || `restaurant_${Date.now()}`;
      const user = await this.account.create(userId, email, password);

      // Calculate trial end date
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + config.trialDays);

      // Create restaurant document in database
      const restaurant = await this.database.createDocument(
        'main_db', // database ID
        'restaurants', // collection ID
        userId,
        {
          user_id: userId,
          name: restaurantName,
          email: email,
          phone: phone,
          subscription_status: 'trial',
          trial_ends: trialEndDate.toISOString(),
          created_at: new Date().toISOString()
        }
      );

      // Auto-login after registration
      await this.account.createEmailSession(email, password);

      return { user, restaurant };
    } catch (error) {
      console.error('Registration error:', error);
      throw new Error(error.message || 'Registration failed');
    }
  }

  async loginEmail(email, password) {
    try {
      const session = await this.account.createEmailSession(email, password);
      const user = await this.account.get();
      this.currentUser = user;
      return { session, user };
    } catch (error) {
      console.error('Login error:', error);
      throw new Error(error.message || 'Login failed');
    }
  }

  async logout() {
    try {
      await this.account.deleteSession('current');
      this.currentUser = null;
      localStorage.removeItem('appwrite_session');
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      throw new Error('Logout failed');
    }
  }

  async getRestaurant(userId) {
    try {
      const restaurant = await this.database.getDocument(
        'main_db',
        'restaurants',
        userId
      );
      return restaurant;
    } catch (error) {
      console.error('Error fetching restaurant:', error);
      return null;
    }
  }

  async checkSession() {
    const user = await this.getCurrentUser();
    return user !== null;
  }

  isTrialExpired(restaurant) {
    if (!restaurant || !restaurant.trial_ends) return true;
    return new Date() > new Date(restaurant.trial_ends);
  }

  daysRemainingInTrial(restaurant) {
    if (!restaurant || !restaurant.trial_ends) return 0;
    const trialEnd = new Date(restaurant.trial_ends);
    const now = new Date();
    const daysRemaining = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysRemaining);
  }
}

// Export singleton instance
export const auth = new AuthManager();

// Auto-init on script load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => auth.init());
} else {
  auth.init();
}

// Utility functions for HTML forms
export async function handleRegisterSubmit(e) {
  e.preventDefault();

  const form = e.target;
  const restaurantName = form.restaurant_name?.value;
  const email = form.email?.value;
  const password = form.password?.value;
  const phone = form.phone?.value;

  if (!restaurantName || !email || !password) {
    alert('Fill all required fields');
    return;
  }

  try {
    await auth.registerRestaurant(restaurantName, email, password, phone);
    window.location.href = '/dashboard';
  } catch (error) {
    alert(`Error: ${error.message}`);
  }
}

export async function handleLoginSubmit(e) {
  e.preventDefault();

  const form = e.target;
  const email = form.email?.value;
  const password = form.password?.value;

  if (!email || !password) {
    alert('Email and password required');
    return;
  }

  try {
    await auth.loginEmail(email, password);
    window.location.href = '/dashboard';
  } catch (error) {
    alert(`Error: ${error.message}`);
  }
}

export async function handleLogout(e) {
  e.preventDefault();
  try {
    await auth.logout();
    window.location.href = '/';
  } catch (error) {
    alert(`Error: ${error.message}`);
  }
}
