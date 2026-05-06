import { config, getAppwriteClient } from './config.js?v=20260506-4';

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
    const normalizedEmail = String(email || '').trim().toLowerCase();
    try {
      const userId = window.Appwrite?.ID?.unique() || `restaurant_${Date.now()}`;

      // 1. Create user account
      const user = await this.account.create(userId, normalizedEmail, password);

      // 2. Create session BEFORE any database writes (need auth)
      await this.ensureSession(normalizedEmail, password);

      // 3. Calculate trial end date
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + config.trialDays);

      // 4. Create restaurant document with user-scoped permissions
      const { Permission, Role } = window.Appwrite;
      const restaurant = await this.database.createDocument(
        'main_db',
        'restaurants',
        userId,
        {
          name: restaurantName,
          email: normalizedEmail,
          phone: phone || '',
          subscription_status: 'trial',
          trial_ends: trialEndDate.toISOString(),
          created_at: new Date().toISOString()
        },
        [
          Permission.read(Role.user(userId)),
          Permission.update(Role.user(userId)),
          Permission.delete(Role.user(userId))
        ]
      );

      return { user, restaurant };
    } catch (error) {
      if (this.isAppwriteErrorType(error, 'user_already_exists')) {
        // Existing account: recover by logging in and ensuring restaurant doc exists
        await this.ensureSession(normalizedEmail, password);
        const user = await this.account.get();
        const restaurant = await this.ensureRestaurantDocument(user.$id, restaurantName, normalizedEmail, phone);
        return { user, restaurant };
      }
      console.error('Registration error:', error);
      throw new Error(error.message || 'Registration failed');
    }
  }

  async loginEmail(email, password) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    try {
      const session = await this.ensureSession(normalizedEmail, password);
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

  isAppwriteErrorType(error, expectedType) {
    if (!error) return false;
    if (error.type === expectedType) return true;
    return typeof error.message === 'string' && error.message.includes(expectedType);
  }

  async ensureSession(email, password) {
    try {
      return await this.account.createEmailPasswordSession(email, password);
    } catch (error) {
      if (this.isAppwriteErrorType(error, 'user_session_already_exists')) {
        // Reuse existing browser session instead of failing login.
        const user = await this.account.get();
        return { userId: user?.$id, active: true };
      }
      throw error;
    }
  }

  async ensureRestaurantDocument(userId, restaurantName, email, phone) {
    const existing = await this.getRestaurant(userId);
    if (existing) return existing;

    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + config.trialDays);
    const { Permission, Role } = window.Appwrite;

    return this.database.createDocument(
      'main_db',
      'restaurants',
      userId,
      {
        name: restaurantName,
        email: email,
        phone: phone || '',
        subscription_status: 'trial',
        trial_ends: trialEndDate.toISOString(),
        created_at: new Date().toISOString()
      },
      [
        Permission.read(Role.user(userId)),
        Permission.update(Role.user(userId)),
        Permission.delete(Role.user(userId))
      ]
    );
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
    window.location.href = '/dashboard.html';
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
    window.location.href = '/dashboard.html';
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
