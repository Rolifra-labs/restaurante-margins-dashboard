// Configuration for Appwrite and n8n endpoints
// Update N8N_WEBHOOK_URL after creating the webhook workflow in n8n

export const config = {
  // Appwrite configuration
  appwriteEndpoint: 'https://backend.rolifra.com',
  appwriteProject: '69fb32a8001bfa20b23c',

  // n8n webhook URL - fill this after creating the webhook workflow
  n8nWebhookUrl: 'https://n8n.rolifra.com/webhook/restaurant-orders', // Replace with actual webhook URL

  // API timeout (ms)
  apiTimeout: 5000,

  // Trial period (days)
  trialDays: 14,

  // Default margin alert threshold (%)
  defaultMinMarginAlert: 15,

  // Pagination
  pageSize: 50,

  // Charts
  chartOptions: {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: true,
        position: 'top'
      }
    }
  }
};

// Initialize Appwrite client
let appwriteClient = null;

export function initAppwrite() {
  if (typeof window !== 'undefined' && window.Appwrite) {
    appwriteClient = new window.Appwrite.Client()
      .setEndpoint(config.appwriteEndpoint)
      .setProject(config.appwriteProject);
    return appwriteClient;
  }
  return null;
}

export function getAppwriteClient() {
  if (!appwriteClient) {
    initAppwrite();
  }
  return appwriteClient;
}
