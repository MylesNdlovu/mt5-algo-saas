<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import Navigation from '$lib/components/Navigation.svelte';
  import type { PageData } from './$types';
  
  export let data: PageData;
  
  let activeTab: 'overview' | 'automations' | 'users' | 'bots' | 'bot-settings' | 'trades' | 'leaderboard' | 'ib-partners' = 'overview';
  let showMenu = false;
  
  // Bot Settings (Admin Only)
  let botSettings = {
    enabled: true,
    lotSize: 0.01,
    maxLotSize: 1.0,
    stopLoss: 50,
    takeProfit: 100,
    maxTotalLoss: 5, // Maximum total loss in $ - closes all trades when reached
    maxDailyProfit: 1000,
    maxLossPerTrade: 5, // Maximum loss per trade in $
    tradingHours: {
      start: '00:00',
      end: '23:59'
    },
    allowedSymbols: ['XAUUSD', 'EURUSD', 'GBPUSD'],
    riskLevel: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH',
    maxOpenTrades: 5,
    trailingStop: false,
    trailingStopDistance: 30,
    breakEven: true,
    breakEvenPips: 20
  };
  let isSavingSettings = false;
  let settingsSaved = false;
  
  // Lot size color indicators
  function getLotSizeColor(lotSize: number): string {
    if (lotSize >= 0.50) return 'green'; // Green for high lot sizes
    if (lotSize >= 0.10) return 'orange'; // Orange for medium lot sizes
    return 'default'; // Default for low lot sizes
  }
  
  // Leaderboard management
  let leaderboardData: any[] = [];
  let leaderboardPeriod: 'daily' | 'weekly' | 'monthly' = 'daily';
  let lastSyncTime: string | null = null;
  let isSyncing = false;
  let editingUser: any = null;
  let showEditModal = false;
  
  // Prize configuration
  let prizes = {
    daily: { first: 100, second: 50, third: 25 },
    weekly: { first: 500, second: 250, third: 100 },
    monthly: { first: 2000, second: 1000, third: 500 }
  };
  let editingPrizes = false;
  
  // IB Partners management
  let ibPartners: any[] = [];
  let selectedIBPartner: any = null;
  let showIBConfigModal = false;
  
  // Stats
  let stats = {
    totalUsers: 247,
    activeUsers: 189,
    trialUsers: 34,
    premiumUsers: 155,
    totalTrades: 15847,
    totalVolume: 1284.73,
    monthlyRevenue: 12450.00,
    yearlyRevenue: 98750.00,
    totalCommissions: 3420.50,
    activeEAs: 156,
    serverUptime: 99.8,
    avgWinRate: 68.5,
    conversionRate: 62.5,
    churnRate: 4.2,
    mrr: 12450.00,
    arr: 149400.00
  };
  
  // Mock Users Data
  let users = [
    { id: 1, name: 'John Smith', email: 'john@example.com', role: 'Premium', status: 'Active', trades: 234, profit: 15420.50, winRate: 72.5, joined: '2024-01-15' },
    { id: 2, name: 'Sarah Johnson', email: 'sarah@example.com', role: 'Trial', status: 'Active', trades: 45, profit: 2340.20, winRate: 68.9, joined: '2024-11-20' },
    { id: 3, name: 'Mike Chen', email: 'mike@example.com', role: 'Premium', status: 'Active', trades: 567, profit: 28950.75, winRate: 75.2, joined: '2024-02-10' },
    { id: 4, name: 'Emily Davis', email: 'emily@example.com', role: 'VIP', status: 'Active', trades: 891, profit: 45230.80, winRate: 78.5, joined: '2023-11-05' },
    { id: 5, name: 'David Wilson', email: 'david@example.com', role: 'Trial', status: 'Inactive', trades: 12, profit: -450.30, winRate: 41.7, joined: '2024-11-28' },
  ];
  
  // Mock Bots Data
  let bots = [
    { id: 1, name: 'Gold Sniper Pro', user: 'John Smith', status: 'Running', trades: 145, profit: 8420.50, winRate: 71.2, uptime: '15d 4h', risk: 'Medium' },
    { id: 2, name: 'Scalper Elite', user: 'Mike Chen', status: 'Running', trades: 289, profit: 15230.75, winRate: 74.8, uptime: '22d 8h', risk: 'Low' },
    { id: 3, name: 'XAU Sniper', user: 'Emily Davis', status: 'Running', trades: 412, profit: 22150.30, winRate: 77.1, uptime: '45d 2h', risk: 'Low' },
    { id: 4, name: 'Quick Gold', user: 'Sarah Johnson', status: 'Paused', trades: 34, profit: 1240.20, winRate: 67.6, uptime: '3d 6h', risk: 'High' },
    { id: 5, name: 'Gold Hunter', user: 'David Wilson', status: 'Stopped', trades: 8, profit: -320.50, winRate: 37.5, uptime: '1d 2h', risk: 'High' },
  ];
  
  // Mock Trades Data
  let trades = [
    { id: 1, user: 'Emily Davis', bot: 'XAU Sniper', symbol: 'XAUUSD', type: 'BUY', volume: 0.5, entry: 2035.45, exit: 2040.20, profit: 237.50, time: '2024-12-02 14:32' },
    { id: 2, user: 'Mike Chen', bot: 'Scalper Elite', symbol: 'XAUUSD', type: 'SELL', volume: 0.3, entry: 2038.80, exit: 2035.10, profit: 111.00, time: '2024-12-02 14:15' },
    { id: 3, user: 'John Smith', bot: 'Gold Sniper Pro', symbol: 'XAUUSD', type: 'BUY', volume: 0.2, entry: 2032.15, exit: 2039.45, profit: 146.00, time: '2024-12-02 13:58' },
    { id: 4, user: 'Sarah Johnson', bot: 'Quick Gold', symbol: 'XAUUSD', type: 'BUY', volume: 0.1, entry: 2036.20, exit: 2034.50, profit: -17.00, time: '2024-12-02 13:45' },
    { id: 5, user: 'Emily Davis', bot: 'XAU Sniper', symbol: 'XAUUSD', type: 'SELL', volume: 0.4, entry: 2039.90, exit: 2036.40, profit: 140.00, time: '2024-12-02 13:20' },
  ];
  
  // Automation types - Extended to match Prisma schema
  type TriggerType = 'LEAD_OPTIN' | 'MT5_REGISTRATION' | 'WINNING_TRADES' | 'LOSING_TRADES' | 'SUBSCRIPTION_UPGRADE' | 'SUBSCRIPTION_EXPIRED' | 'HIGH_PROFIT_ACHIEVED' | 'CONSECUTIVE_LOSSES' | 'ACCOUNT_INACTIVE' | 'TRIAL_ENDING';
  type ActionType = 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH_NOTIFICATION' | 'IN_APP_MESSAGE';
  type AutomationStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  
  interface Automation {
    id: string;
    name: string;
    description?: string;
    triggerType: TriggerType;
    triggerValue?: number;
    triggerData?: any;
    actionTypes: ActionType[];  // Multiple channels support
    actionData?: any;
    messageSubject?: string;
    messageBody: string;
    status: AutomationStatus;
    priority?: number;
    totalTriggered: number;
    totalSent: number;
    totalFailed: number;
    lastTriggered?: string;
    createdAt: string;
    updatedAt: string;
  }
  
  interface ActivityLog {
    id: number;
    timestamp: string;
    user: string;
    trigger: string;
    action: string;
    status: 'sent' | 'failed';
  }
  
  // Automations from database
  let automations: Automation[] = [];
  let isLoadingAutomations = false;
  let automationError = '';
  
  // Load automations from database
  async function loadAutomations() {
    isLoadingAutomations = true;
    automationError = '';
    try {
      const response = await fetch('/api/admin/automations');
      if (response.ok) {
        const data = await response.json();
        automations = data.automations || [];
      } else {
        automationError = 'Failed to load automations';
        console.error('Failed to load automations:', response.statusText);
      }
    } catch (error) {
      automationError = 'Error loading automations';
      console.error('Error loading automations:', error);
    } finally {
      isLoadingAutomations = false;
    }
  }
  
  // Sample automations (fallback if DB is empty)
  const sampleAutomations: Automation[] = [
    {
      id: '1',
      name: 'Welcome New Leads',
      triggerType: 'LEAD_OPTIN',
      actionType: 'EMAIL',
      messageBody: 'Welcome to SCALPERIUM! 🎉 Get ready to scale your trading success.',
      status: 'ACTIVE',
      totalSent: 247,
      totalTriggered: 247,
      totalFailed: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '2',
      name: 'MT5 Connected',
      triggerType: 'MT5_REGISTRATION',
      actionType: 'WHATSAPP',
      messageBody: 'Your MT5 account is now connected! 🚀 Start trading with confidence.',
      status: 'ACTIVE',
      totalSent: 163,
      totalTriggered: 163,
      totalFailed: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 3,
      name: 'Winning Streak',
      trigger: 'winning_trades',
      tradeCount: 5,
      action: 'sms',
      message: '🔥 Congratulations! You just hit 5 winning trades in a row! Keep up the momentum!',
      enabled: true,
      totalSent: 89
    },
    {
      id: 4,
      name: 'Encourage After Losses',
      trigger: 'losing_trades',
      tradeCount: 3,
      action: 'email',
      message: 'Hey there! Trading has its ups and downs. 💪 Review your strategy and come back stronger!',
      enabled: true,
      totalSent: 34
    }
  ];
  
  // Sample activity logs
  let activityLogs: ActivityLog[] = [
    {
      id: 1,
      timestamp: '2024-01-15 14:23:45',
      user: 'john@trader.com',
      trigger: 'Winning Streak (5 trades)',
      action: 'SMS',
      status: 'sent'
    },
    {
      id: 2,
      timestamp: '2024-01-15 13:15:22',
      user: 'sarah@trader.com',
      trigger: 'MT5 Connected',
      action: 'WhatsApp',
      status: 'sent'
    },
    {
      id: 3,
      timestamp: '2024-01-15 12:08:11',
      user: 'mike@trader.com',
      trigger: 'Welcome New Leads',
      action: 'Email',
      status: 'sent'
    },
    {
      id: 4,
      timestamp: '2024-01-15 11:45:33',
      user: 'lisa@trader.com',
      trigger: 'Encourage After Losses (3 trades)',
      action: 'Email',
      status: 'sent'
    },
    {
      id: 5,
      timestamp: '2024-01-15 10:22:19',
      user: 'david@trader.com',
      trigger: 'Winning Streak (5 trades)',
      action: 'SMS',
      status: 'failed'
    }
  ];
  
  // Form state
  let showForm = false;
  let editingId: string | null = null;
  let isSaving = false;
  let formData: Partial<Automation> = {
    name: '',
    description: '',
    triggerType: 'LEAD_OPTIN',
    triggerValue: undefined,
    actionTypes: [],  // Multiple channels
    messageSubject: '',
    messageBody: '',
    status: 'ACTIVE',
    priority: 5
  };
  
  function resetForm() {
    formData = {
      name: '',
      description: '',
      triggerType: 'LEAD_OPTIN',
      triggerValue: undefined,
      actionTypes: [],
      messageSubject: '',
      messageBody: '',
      status: 'ACTIVE',
      priority: 5
    };
    editingId = null;
  }
  
  function closeForm() {
    resetForm();
    showForm = false;
  }
  
  function addAutomation() {
    resetForm();
    showForm = true;
  }
  
  function editAutomation(automation: Automation) {
    showForm = true;
    editingId = automation.id;
    formData = {
      name: automation.name,
      description: automation.description,
      triggerType: automation.triggerType,
      triggerValue: automation.triggerValue,
      actionTypes: automation.actionTypes || [],
      messageSubject: automation.messageSubject,
      messageBody: automation.messageBody,
      status: automation.status,
      priority: automation.priority
    };
  }
  
  async function saveAutomation() {
    // Validate required fields
    if (!formData.name?.trim()) {
      alert('⚠️ Please enter an automation name');
      return;
    }
    if (!formData.messageBody?.trim()) {
      alert('⚠️ Please enter a message');
      return;
    }
    if (!formData.actionTypes || formData.actionTypes.length === 0) {
      alert('⚠️ Please select at least one notification channel');
      return;
    }
    
    isSaving = true;
    try {
      // Prepare payload with cleaned data
      const payload = {
        name: formData.name.trim(),
        description: formData.description?.trim() || '',
        triggerType: formData.triggerType,
        triggerValue: formData.triggerValue,
        actionTypes: formData.actionTypes,
        messageSubject: formData.messageSubject?.trim() || '',
        messageBody: formData.messageBody.trim(),
        status: formData.status || 'ACTIVE',
        priority: formData.priority || 5
      };

      if (editingId) {
        // Update existing automation
        const response = await fetch('/api/admin/automations', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            automationId: editingId,
            updates: payload
          })
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update automation');
        }
        
        const data = await response.json();
        
        // Update local state
        automations = automations.map(a => 
          a.id === editingId ? data.automation : a
        );
        
        alert('✅ Automation updated successfully!');
        closeForm();
      } else {
        // Create new automation
        const response = await fetch('/api/admin/automations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create automation');
        }
        
        const data = await response.json();
        
        // Add to local state
        automations = [...automations, data.automation];
        
        alert('✅ Automation created successfully!');
        closeForm();
      }
      
      // Reload to ensure sync with file storage
      await loadAutomations();
    } catch (error: any) {
      console.error('Error saving automation:', error);
      alert(`❌ Error: ${error.message || 'Failed to save automation'}`);
    } finally {
      isSaving = false;
    }
  }
  
  async function deleteAutomation(id: string) {
    const automation = automations.find(a => a.id === id);
    if (!confirm(`Are you sure you want to delete "${automation?.name}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/admin/automations?id=${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        automations = automations.filter(a => a.id !== id);
        alert('Automation deleted successfully!');
        await loadAutomations(); // Reload to ensure sync
      } else {
        const error = await response.json();
        alert(`Failed to delete automation: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting automation:', error);
      alert('An error occurred while deleting the automation');
    }
  }
  
  async function toggleAutomation(id: string) {
    const automation = automations.find(a => a.id === id);
    if (!automation) return;
    
    const newStatus = automation.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    
    try {
      const response = await fetch('/api/admin/automations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          automationId: id,
          updates: { status: newStatus }
        })
      });
      
      if (response.ok) {
        automations = automations.map(a => 
          a.id === id ? { ...a, status: newStatus } : a
        );
      } else {
        const error = await response.json();
        alert(`Failed to toggle automation: ${error.error}`);
      }
    } catch (error) {
      console.error('Error toggling automation:', error);
      alert('An error occurred while toggling the automation');
    }
  }
  
  // Leaderboard functions
  async function loadLeaderboard() {
    try {
      const response = await fetch(`/api/leaderboard?period=${leaderboardPeriod}&limit=100`);
      if (response.ok) {
        const data = await response.json();
        leaderboardData = data.entries || [];
        lastSyncTime = new Date().toLocaleString();
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
  }
  
  async function syncLeaderboard() {
    isSyncing = true;
    try {
      const response = await fetch('/api/leaderboard/sync', { method: 'POST' });
      if (response.ok) {
        await loadLeaderboard();
        alert('✅ Leaderboard synced successfully!');
      } else {
        alert('❌ Failed to sync leaderboard');
      }
    } catch (error) {
      console.error('Error syncing:', error);
      alert('❌ Error syncing leaderboard');
    } finally {
      isSyncing = false;
    }
  }
  
  function openEditModal(user: any) {
    editingUser = { ...user };
    showEditModal = true;
  }
  
  async function saveUserStats() {
    try {
      const response = await fetch('/api/admin/leaderboard/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingUser)
      });
      
      if (response.ok) {
        showEditModal = false;
        await loadLeaderboard();
        alert('✅ User stats updated!');
      } else {
        alert('❌ Failed to update stats');
      }
    } catch (error) {
      console.error('Error updating stats:', error);
      alert('❌ Error updating stats');
    }
  }
  
  async function savePrizes() {
    try {
      const response = await fetch('/api/admin/prizes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prizes)
      });
      
      if (response.ok) {
        editingPrizes = false;
        alert('✅ Prizes updated!');
      } else {
        alert('❌ Failed to update prizes');
      }
    } catch (error) {
      console.error('Error saving prizes:', error);
    }
  }
  
  // IB Partners management functions
  async function loadIBPartners() {
    try {
      const response = await fetch('/api/admin/ib-partners');
      if (response.ok) {
        const data = await response.json();
        ibPartners = data.partners;
      }
    } catch (error) {
      console.error('Error loading IB partners:', error);
    }
  }
  
  async function approveIBPartner(ibId: string) {
    if (!confirm('Approve this IB partner application?')) return;
    
    try {
      const response = await fetch('/api/admin/ib-partners/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ibId })
      });
      
      if (response.ok) {
        alert('✅ IB Partner approved!');
        loadIBPartners();
      }
    } catch (error) {
      console.error('Error approving IB partner:', error);
    }
  }
  
  async function toggleIBStatus(ibId: string, currentStatus: boolean) {
    try {
      const response = await fetch('/api/admin/ib-partners/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ibId, isActive: !currentStatus })
      });
      
      if (response.ok) {
        alert(`✅ IB Partner ${!currentStatus ? 'activated' : 'deactivated'}!`);
        loadIBPartners();
      }
    } catch (error) {
      console.error('Error toggling IB status:', error);
    }
  }
  
  // Load bot settings from agent
  async function loadBotSettings() {
    try {
      const response = await fetch('/api/admin/bot-settings');
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          botSettings = { ...botSettings, ...data.settings };
        }
      }
    } catch (error) {
      console.error('Error loading bot settings:', error);
    }
  }
  
  // Save bot settings to agent
  async function saveBotSettings() {
    isSavingSettings = true;
    settingsSaved = false;
    
    try {
      const response = await fetch('/api/admin/bot-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(botSettings)
      });
      
      if (response.ok) {
        settingsSaved = true;
        alert('✅ Bot settings saved and sent to C# agent successfully!');
        setTimeout(() => settingsSaved = false, 3000);
      } else {
        const error = await response.json();
        alert(`❌ Failed to save settings: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving bot settings:', error);
      alert('❌ Error connecting to server');
    } finally {
      isSavingSettings = false;
    }
  }
  
  // Load automations on component mount
  onMount(() => {
    loadAutomations();
    loadLeaderboard();
    loadBotSettings();
  });
  
  function getTriggerLabel(trigger: TriggerType, count?: number): string {
    const labels: Record<TriggerType, string> = {
      LEAD_OPTIN: 'Lead Opt-in',
      MT5_REGISTRATION: 'MT5 Registration',
      WINNING_TRADES: `Winning Trades${count ? ` (${count})` : ''}`,
      LOSING_TRADES: `Losing Trades${count ? ` (${count})` : ''}`,
      SUBSCRIPTION_UPGRADE: 'Subscription Upgrade',
      SUBSCRIPTION_EXPIRED: 'Subscription Expired',
      HIGH_PROFIT_ACHIEVED: 'High Profit Achieved',
      CONSECUTIVE_LOSSES: 'Consecutive Losses',
      ACCOUNT_INACTIVE: 'Account Inactive',
      TRIAL_ENDING: 'Trial Ending'
    };
    return labels[trigger] || trigger;
  }
  
  function getActionIcon(action: ActionType): string {
    const icons: Record<ActionType, string> = {
      EMAIL: '✉️',
      SMS: '📱',
      WHATSAPP: '💬',
      PUSH_NOTIFICATION: '🔔',
      IN_APP_MESSAGE: '💬'
    };
    return icons[action] || '📋';
  }
  
  function toggleActionType(actionType: ActionType) {
    if (!formData.actionTypes) {
      formData.actionTypes = [];
    }
    if (formData.actionTypes.includes(actionType)) {
      formData.actionTypes = formData.actionTypes.filter(a => a !== actionType);
    } else {
      formData.actionTypes = [...formData.actionTypes, actionType];
    }
  }
</script>

<Navigation />

<div class="min-h-screen bg-black text-gray-300">
  <!-- Header with Menu -->
  <div class="border-b border-gray-800">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button 
            on:click={() => showMenu = !showMenu}
            class="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div>
            <h1 class="text-3xl font-bold" style="font-family: 'Orbitron', sans-serif; color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);">
              SCALPERIUM Admin
            </h1>
            <p class="mt-1 text-sm text-gray-500">Manage your trading platform</p>
          </div>
        </div>
        <a href="/dashboard" class="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-sm">
          Back to Dashboard
        </a>
      </div>
    </div>
  </div>
  
  <!-- Side Menu -->
  {#if showMenu}
    <div 
      class="fixed inset-0 bg-black bg-opacity-50 z-40"
      on:click={() => showMenu = false}
      on:keydown={(e) => e.key === 'Escape' && (showMenu = false)}
      role="button"
      tabindex="0"
    ></div>
  {/if}
  
  <nav 
    class="fixed top-0 left-0 h-full w-80 bg-gradient-to-br from-gray-900 to-black border-r border-gray-800 z-50 transform transition-transform duration-300 overflow-y-auto"
    class:translate-x-0={showMenu}
    class:-translate-x-full={!showMenu}
  >
    <div class="p-6">
      <div class="flex items-center justify-between mb-8">
        <h2 class="text-xl font-bold" style="font-family: 'Orbitron', sans-serif; color: #9ca3af; text-shadow: 0 0 8px rgba(239, 68, 68, 0.5);">
          Admin Menu
        </h2>
        <button 
          on:click={() => showMenu = false}
          class="p-2 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div class="space-y-2">
        <button
          on:click={() => { activeTab = 'overview'; showMenu = false; }}
          class="w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left"
          class:bg-red-500={activeTab === 'overview'}
          class:bg-opacity-20={activeTab === 'overview'}
          class:border={activeTab === 'overview'}
          class:border-red-500={activeTab === 'overview'}
          class:hover:bg-gray-800={activeTab !== 'overview'}
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span>Overview</span>
        </button>
        
        <button
          on:click={() => { activeTab = 'automations'; showMenu = false; }}
          class="w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left"
          class:bg-red-500={activeTab === 'automations'}
          class:bg-opacity-20={activeTab === 'automations'}
          class:border={activeTab === 'automations'}
          class:border-red-500={activeTab === 'automations'}
          class:hover:bg-gray-800={activeTab !== 'automations'}
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>Automations</span>
        </button>
        
        <button
          on:click={() => { activeTab = 'users'; showMenu = false; }}
          class="w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left"
          class:bg-red-500={activeTab === 'users'}
          class:bg-opacity-20={activeTab === 'users'}
          class:border={activeTab === 'users'}
          class:border-red-500={activeTab === 'users'}
          class:hover:bg-gray-800={activeTab !== 'users'}
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span>Users</span>
        </button>
        
        <button
          on:click={() => { activeTab = 'bots'; showMenu = false; }}
          class="w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left"
          class:bg-red-500={activeTab === 'bots'}
          class:bg-opacity-20={activeTab === 'bots'}
          class:border={activeTab === 'bots'}
          class:border-red-500={activeTab === 'bots'}
          class:hover:bg-gray-800={activeTab !== 'bots'}
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span>Trading Bots</span>
        </button>
        
        <button
          on:click={() => { activeTab = 'bot-settings'; showMenu = false; }}
          class="w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left"
          class:bg-red-500={activeTab === 'bot-settings'}
          class:bg-opacity-20={activeTab === 'bot-settings'}
          class:border={activeTab === 'bot-settings'}
          class:border-red-500={activeTab === 'bot-settings'}
          class:hover:bg-gray-800={activeTab !== 'bot-settings'}
        >
          <svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>⚙️ Bot Settings</span>
        </button>
        
        <button
          on:click={() => { activeTab = 'trades'; showMenu = false; }}
          class="w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left"
          class:bg-red-500={activeTab === 'trades'}
          class:bg-opacity-20={activeTab === 'trades'}
          class:border={activeTab === 'trades'}
          class:border-red-500={activeTab === 'trades'}
          class:hover:bg-gray-800={activeTab !== 'trades'}
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <span>Recent Trades</span>
        </button>
        
        <button
          on:click={() => { activeTab = 'leaderboard'; showMenu = false; }}
          class="w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left"
          class:bg-red-500={activeTab === 'leaderboard'}
          class:bg-opacity-20={activeTab === 'leaderboard'}
          class:border={activeTab === 'leaderboard'}
          class:border-red-500={activeTab === 'leaderboard'}
          class:hover:bg-gray-800={activeTab !== 'leaderboard'}
        >
          <svg class="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
          <span>🏆 Leaderboard</span>
        </button>

        <!-- IB Partners Tab -->
        <button
          on:click={() => activeTab = 'ib-partners'}
          class="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 w-full text-left"
          class:bg-gradient-to-r={activeTab === 'ib-partners'}
          class:from-red-500={activeTab === 'ib-partners'}
          class:to-red-700={activeTab === 'ib-partners'}
          class:text-white={activeTab === 'ib-partners'}
          class:shadow-lg={activeTab === 'ib-partners'}
          class:border={activeTab === 'ib-partners'}
          class:border-red-500={activeTab === 'ib-partners'}
          class:hover:bg-gray-800={activeTab !== 'ib-partners'}
        >
          <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span>🤝 IB Partners</span>
        </button>

        <!-- Agent Control Panel -->
        <a
          href="/agents"
          class="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 w-full text-left hover:bg-gray-800"
        >
          <svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
          <span>🤖 Agent Control</span>
        </a>
      </div>
    </div>
  </nav>
  
  <!-- Main Content -->
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    
    <!-- Overview Tab -->
    {#if activeTab === 'overview'}
      <div class="space-y-8">
        <!-- Key Metrics -->
        <div>
          <h2 class="text-2xl font-bold mb-6" style="color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);">
            Key Metrics
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div class="bg-gradient-to-br from-gray-900 to-black p-6 rounded-lg border border-gray-800">
              <div class="text-sm text-gray-500 mb-2">Total Users</div>
              <div class="text-3xl font-bold mb-1" style="color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);">
                {stats.totalUsers}
              </div>
              <div class="text-xs text-green-400">↑ 23 this month</div>
            </div>
            
            <div class="bg-gradient-to-br from-gray-900 to-black p-6 rounded-lg border border-gray-800">
              <div class="text-sm text-gray-500 mb-2">Active Users</div>
              <div class="text-3xl font-bold mb-1" style="color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);">
                {stats.activeUsers}
              </div>
              <div class="text-xs text-gray-400">{((stats.activeUsers / stats.totalUsers) * 100).toFixed(1)}% active</div>
            </div>
            
            <div class="bg-gradient-to-br from-gray-900 to-black p-6 rounded-lg border border-gray-800">
              <div class="text-sm text-gray-500 mb-2">Monthly Revenue</div>
              <div class="text-3xl font-bold mb-1" style="color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);">
                ${stats.monthlyRevenue.toLocaleString()}
              </div>
              <div class="text-xs text-green-400">↑ 12.5% from last month</div>
            </div>
            
            <div class="bg-gradient-to-br from-gray-900 to-black p-6 rounded-lg border border-gray-800">
              <div class="text-sm text-gray-500 mb-2">Conversion Rate</div>
              <div class="text-3xl font-bold mb-1" style="color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);">
                {stats.conversionRate}%
              </div>
              <div class="text-xs text-green-400">↑ 2.3% improvement</div>
            </div>
          </div>
        </div>
        
        <!-- Trading Stats -->
        <div>
          <h2 class="text-2xl font-bold mb-6" style="color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);">
            Trading Performance
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div class="bg-gradient-to-br from-gray-900 to-black p-6 rounded-lg border border-gray-800">
              <div class="text-sm text-gray-500 mb-2">Total Trades</div>
              <div class="text-3xl font-bold" style="color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);">
                {stats.totalTrades.toLocaleString()}
              </div>
            </div>
            
            <div class="bg-gradient-to-br from-gray-900 to-black p-6 rounded-lg border border-gray-800">
              <div class="text-sm text-gray-500 mb-2">Active EAs</div>
              <div class="text-3xl font-bold" style="color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);">
                {stats.activeEAs}
              </div>
            </div>
            
            <div class="bg-gradient-to-br from-gray-900 to-black p-6 rounded-lg border border-gray-800">
              <div class="text-sm text-gray-500 mb-2">Avg Win Rate</div>
              <div class="text-3xl font-bold" style="color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);">
                {stats.avgWinRate}%
              </div>
            </div>
            
            <div class="bg-gradient-to-br from-gray-900 to-black p-6 rounded-lg border border-gray-800">
              <div class="text-sm text-gray-500 mb-2">Total Volume</div>
              <div class="text-3xl font-bold" style="color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);">
                {stats.totalVolume.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
        
        <!-- Business Metrics -->
        <div>
          <h2 class="text-2xl font-bold mb-6" style="color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);">
            Business Metrics
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div class="bg-gradient-to-br from-gray-900 to-black p-6 rounded-lg border border-gray-800">
              <div class="text-sm text-gray-500 mb-2">MRR</div>
              <div class="text-3xl font-bold mb-1" style="color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);">
                ${stats.mrr.toLocaleString()}
              </div>
              <div class="text-xs text-gray-400">Monthly Recurring</div>
            </div>
            
            <div class="bg-gradient-to-br from-gray-900 to-black p-6 rounded-lg border border-gray-800">
              <div class="text-sm text-gray-500 mb-2">ARR</div>
              <div class="text-3xl font-bold mb-1" style="color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);">
                ${stats.arr.toLocaleString()}
              </div>
              <div class="text-xs text-gray-400">Annual Recurring</div>
            </div>
            
            <div class="bg-gradient-to-br from-gray-900 to-black p-6 rounded-lg border border-gray-800">
              <div class="text-sm text-gray-500 mb-2">Churn Rate</div>
              <div class="text-3xl font-bold mb-1" style="color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);">
                {stats.churnRate}%
              </div>
              <div class="text-xs text-green-400">↓ 0.8% improvement</div>
            </div>
            
            <div class="bg-gradient-to-br from-gray-900 to-black p-6 rounded-lg border border-gray-800">
              <div class="text-sm text-gray-500 mb-2">Commissions</div>
              <div class="text-3xl font-bold mb-1" style="color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);">
                ${stats.totalCommissions.toLocaleString()}
              </div>
              <div class="text-xs text-gray-400">This month</div>
            </div>
          </div>
        </div>
        
        <!-- User Breakdown -->
        <div>
          <h2 class="text-2xl font-bold mb-6" style="color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);">
            User Breakdown
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="bg-gradient-to-br from-gray-900 to-black p-6 rounded-lg border border-gray-800">
              <div class="text-sm text-gray-500 mb-2">Premium Users</div>
              <div class="text-3xl font-bold" style="color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);">
                {stats.premiumUsers}
              </div>
            </div>
            
            <div class="bg-gradient-to-br from-gray-900 to-black p-6 rounded-lg border border-gray-800">
              <div class="text-sm text-gray-500 mb-2">Trial Users</div>
              <div class="text-3xl font-bold" style="color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);">
                {stats.trialUsers}
              </div>
            </div>
            
            <div class="bg-gradient-to-br from-gray-900 to-black p-6 rounded-lg border border-gray-800">
              <div class="text-sm text-gray-500 mb-2">Server Uptime</div>
              <div class="text-3xl font-bold" style="color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);">
                {stats.serverUptime}%
              </div>
            </div>
          </div>
        </div>
        
        <!-- Smart Insights -->
        <div>
          <h2 class="text-2xl font-bold mb-6" style="color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);">
            Smart Insights
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Revenue Insight -->
            <div class="bg-gradient-to-br from-green-900/20 to-green-950/20 p-6 rounded-lg border border-green-800/50">
              <div class="flex items-start gap-4">
                <div class="text-3xl">💰</div>
                <div class="flex-1">
                  <h3 class="text-lg font-semibold text-green-400 mb-2">Strong Revenue Growth</h3>
                  <p class="text-sm text-gray-400 mb-3">
                    Your MRR increased by 12.5% this month. At this rate, you're on track to reach $15,000 MRR by next month.
                  </p>
                  <div class="flex items-center gap-2 text-xs text-green-400">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <span>Trending up</span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Conversion Insight -->
            <div class="bg-gradient-to-br from-blue-900/20 to-blue-950/20 p-6 rounded-lg border border-blue-800/50">
              <div class="flex items-start gap-4">
                <div class="text-3xl">📊</div>
                <div class="flex-1">
                  <h3 class="text-lg font-semibold text-blue-400 mb-2">Excellent Conversion Rate</h3>
                  <p class="text-sm text-gray-400 mb-3">
                    62.5% of trial users convert to premium - well above industry average of 25%. Your onboarding is working!
                  </p>
                  <div class="flex items-center gap-2 text-xs text-blue-400">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Above average</span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Churn Warning -->
            <div class="bg-gradient-to-br from-yellow-900/20 to-yellow-950/20 p-6 rounded-lg border border-yellow-800/50">
              <div class="flex items-start gap-4">
                <div class="text-3xl">⚠️</div>
                <div class="flex-1">
                  <h3 class="text-lg font-semibold text-yellow-400 mb-2">Monitor Churn Rate</h3>
                  <p class="text-sm text-gray-400 mb-3">
                    Churn rate at 4.2% is healthy but watch closely. Consider implementing win-back campaigns for at-risk users.
                  </p>
                  <div class="flex items-center gap-2 text-xs text-yellow-400">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>Needs attention</span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Trading Performance -->
            <div class="bg-gradient-to-br from-purple-900/20 to-purple-950/20 p-6 rounded-lg border border-purple-800/50">
              <div class="flex items-start gap-4">
                <div class="text-3xl">🎯</div>
                <div class="flex-1">
                  <h3 class="text-lg font-semibold text-purple-400 mb-2">High Trading Activity</h3>
                  <p class="text-sm text-gray-400 mb-3">
                    156 active bots executing {stats.totalTrades.toLocaleString()} trades with {stats.avgWinRate}% win rate. Users are engaged!
                  </p>
                  <div class="flex items-center gap-2 text-xs text-purple-400">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Highly engaged</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Growth Projections -->
        <div>
          <h2 class="text-2xl font-bold mb-6" style="color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);">
            Growth Projections
          </h2>
          <div class="bg-gradient-to-br from-gray-900 to-black p-6 rounded-lg border border-gray-800">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div class="text-sm text-gray-500 mb-2">Next Month Projection</div>
                <div class="text-2xl font-bold text-green-400 mb-1">$14,000</div>
                <div class="text-xs text-gray-400">+12.5% growth rate</div>
                <div class="mt-4 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div class="h-full bg-gradient-to-r from-green-600 to-green-400" style="width: 70%"></div>
                </div>
              </div>
              
              <div>
                <div class="text-sm text-gray-500 mb-2">Q1 2026 Target</div>
                <div class="text-2xl font-bold text-blue-400 mb-1">$45,000</div>
                <div class="text-xs text-gray-400">3-month forecast</div>
                <div class="mt-4 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div class="h-full bg-gradient-to-r from-blue-600 to-blue-400" style="width: 55%"></div>
                </div>
              </div>
              
              <div>
                <div class="text-sm text-gray-500 mb-2">Year-End ARR Goal</div>
                <div class="text-2xl font-bold text-purple-400 mb-1">$200,000</div>
                <div class="text-xs text-gray-400">Current: ${stats.arr.toLocaleString()}</div>
                <div class="mt-4 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div class="h-full bg-gradient-to-r from-purple-600 to-purple-400" style="width: 75%"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Quick Actions -->
        <div>
          <h2 class="text-2xl font-bold mb-6" style="color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);">
            Quick Actions
          </h2>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button class="p-4 bg-gradient-to-br from-gray-900 to-black rounded-lg border border-gray-800 hover:border-red-500 transition-all duration-200 text-left">
              <div class="text-2xl mb-2">📧</div>
              <div class="text-sm font-semibold text-gray-300">Email All Users</div>
              <div class="text-xs text-gray-500 mt-1">Broadcast message</div>
            </button>
            
            <button class="p-4 bg-gradient-to-br from-gray-900 to-black rounded-lg border border-gray-800 hover:border-red-500 transition-all duration-200 text-left">
              <div class="text-2xl mb-2">📊</div>
              <div class="text-sm font-semibold text-gray-300">Export Report</div>
              <div class="text-xs text-gray-500 mt-1">Download CSV</div>
            </button>
            
            <button class="p-4 bg-gradient-to-br from-gray-900 to-black rounded-lg border border-gray-800 hover:border-red-500 transition-all duration-200 text-left">
              <div class="text-2xl mb-2">🎯</div>
              <div class="text-sm font-semibold text-gray-300">Set Targets</div>
              <div class="text-xs text-gray-500 mt-1">Business goals</div>
            </button>
            
            <button class="p-4 bg-gradient-to-br from-gray-900 to-black rounded-lg border border-gray-800 hover:border-red-500 transition-all duration-200 text-left">
              <div class="text-2xl mb-2">⚙️</div>
              <div class="text-sm font-semibold text-gray-300">System Health</div>
              <div class="text-xs text-gray-500 mt-1">View diagnostics</div>
            </button>
          </div>
        </div>
      </div>
    {/if}
    
    <!-- Users Tab -->
    {#if activeTab === 'users'}
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-bold" style="color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);">
            User Management
          </h2>
          <button class="px-4 py-2 bg-gradient-to-r from-red-500 to-red-700 text-white rounded-lg font-semibold hover:from-red-600 hover:to-red-800">
            + Add User
          </button>
        </div>
        
        <!-- Users Table -->
        <div class="bg-gradient-to-br from-gray-900 to-black rounded-lg border border-gray-800 overflow-hidden">
          <table class="w-full">
            <thead class="bg-black bg-opacity-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">User</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Role</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Trades</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Profit</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Win Rate</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Joined</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-800">
              {#each users as user}
                <tr class="hover:bg-gray-800/50 transition-colors">
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white font-bold">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <div class="text-sm font-semibold text-gray-300">{user.name}</div>
                        <div class="text-xs text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <span class="px-3 py-1 text-xs rounded-full border
                      {user.role === 'VIP' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500' : ''}
                      {user.role === 'Premium' ? 'bg-purple-500/20 text-purple-400 border-purple-500' : ''}
                      {user.role === 'Trial' ? 'bg-blue-500/20 text-blue-400 border-blue-500' : ''}
                    ">
                      {user.role}
                    </span>
                  </td>
                  <td class="px-6 py-4">
                    <span class="px-3 py-1 text-xs rounded-full
                      {user.status === 'Active' ? 'bg-green-500/20 text-green-400 border border-green-500' : 'bg-gray-500/20 text-gray-400 border border-gray-500'}
                    ">
                      {user.status}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-300">{user.trades}</td>
                  <td class="px-6 py-4 text-sm {user.profit >= 0 ? 'text-green-400' : 'text-red-400'}">
                    ${user.profit.toFixed(2)}
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-300">{user.winRate}%</td>
                  <td class="px-6 py-4 text-sm text-gray-400">{user.joined}</td>
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-2">
                      <button class="p-1 text-blue-400 hover:bg-blue-500/20 rounded">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button class="p-1 text-yellow-400 hover:bg-yellow-500/20 rounded">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button class="p-1 text-red-400 hover:bg-red-500/20 rounded">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}
    
    <!-- Bots Tab -->
    {#if activeTab === 'bots'}
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-bold" style="color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);">
            Trading Bots
          </h2>
          <div class="flex gap-3">
            <button class="px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500 rounded-lg hover:bg-blue-500/30">
              Stop All
            </button>
            <button class="px-4 py-2 bg-gradient-to-r from-green-500 to-green-700 text-white rounded-lg font-semibold hover:from-green-600 hover:to-green-800">
              Start All
            </button>
          </div>
        </div>
        
        <!-- Bots Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {#each bots as bot}
            <div class="bg-gradient-to-br from-gray-900 to-black p-6 rounded-lg border border-gray-800">
              <div class="flex items-start justify-between mb-4">
                <div>
                  <h3 class="text-lg font-bold text-gray-300 mb-1">{bot.name}</h3>
                  <p class="text-sm text-gray-500">{bot.user}</p>
                </div>
                <span class="px-3 py-1 text-xs rounded-full
                  {bot.status === 'Running' ? 'bg-green-500/20 text-green-400 border border-green-500' : ''}
                  {bot.status === 'Paused' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500' : ''}
                  {bot.status === 'Stopped' ? 'bg-red-500/20 text-red-400 border border-red-500' : ''}
                ">
                  {bot.status}
                </span>
              </div>
              
              <div class="grid grid-cols-2 gap-4 mb-4">
                <div class="bg-black/50 p-3 rounded border border-gray-800">
                  <div class="text-xs text-gray-500 mb-1">Profit</div>
                  <div class="text-lg font-bold {bot.profit >= 0 ? 'text-green-400' : 'text-red-400'}">
                    ${bot.profit.toFixed(2)}
                  </div>
                </div>
                <div class="bg-black/50 p-3 rounded border border-gray-800">
                  <div class="text-xs text-gray-500 mb-1">Win Rate</div>
                  <div class="text-lg font-bold text-gray-300">{bot.winRate}%</div>
                </div>
                <div class="bg-black/50 p-3 rounded border border-gray-800">
                  <div class="text-xs text-gray-500 mb-1">Trades</div>
                  <div class="text-lg font-bold text-gray-300">{bot.trades}</div>
                </div>
                <div class="bg-black/50 p-3 rounded border border-gray-800">
                  <div class="text-xs text-gray-500 mb-1">Uptime</div>
                  <div class="text-lg font-bold text-gray-300">{bot.uptime}</div>
                </div>
              </div>
              
              <div class="flex items-center justify-between mb-4">
                <span class="text-xs text-gray-500">Risk Level:</span>
                <span class="px-3 py-1 text-xs rounded-full
                  {bot.risk === 'Low' ? 'bg-green-500/20 text-green-400 border border-green-500' : ''}
                  {bot.risk === 'Medium' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500' : ''}
                  {bot.risk === 'High' ? 'bg-red-500/20 text-red-400 border border-red-500' : ''}
                ">
                  {bot.risk}
                </span>
              </div>
              
              <div class="flex gap-2">
                {#if bot.status === 'Running'}
                  <button class="flex-1 px-4 py-2 bg-yellow-500/20 text-yellow-400 border border-yellow-500 rounded hover:bg-yellow-500/30">
                    Pause
                  </button>
                  <button class="flex-1 px-4 py-2 bg-red-500/20 text-red-400 border border-red-500 rounded hover:bg-red-500/30">
                    Stop
                  </button>
                {:else}
                  <button class="flex-1 px-4 py-2 bg-green-500/20 text-green-400 border border-green-500 rounded hover:bg-green-500/30">
                    Start
                  </button>
                  <button class="flex-1 px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500 rounded hover:bg-blue-500/30">
                    Configure
                  </button>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
    
    <!-- Bot Settings Tab (Admin Only) -->
    {#if activeTab === 'bot-settings'}
      <div class="space-y-6">
        <!-- Header -->
        <div class="sticky top-0 z-10 bg-black/95 backdrop-blur-sm border-b border-gray-800 pb-4 mb-6">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-2xl font-bold mb-2" style="color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);">
                ⚙️ Global Bot Settings
              </h2>
              <p class="text-sm text-gray-400">Configure trading parameters sent to C# agent</p>
              <p class="text-xs text-yellow-400 mt-1">⚠️ Admin Only - These settings apply to all trading bots</p>
            </div>
            <button
              on:click={saveBotSettings}
              disabled={isSavingSettings}
              class="px-6 py-3 bg-gradient-to-r from-green-500 to-green-700 text-white rounded-lg font-semibold hover:from-green-600 hover:to-green-800 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 shadow-lg hover:shadow-xl"
            >
              {#if isSavingSettings}
                <svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Saving...</span>
              {:else if settingsSaved}
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Saved!</span>
              {:else}
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                <span>Save & Apply to Agent</span>
              {/if}
            </button>
          </div>
        </div>

        <!-- Settings Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <!-- General Settings -->
          <div class="bg-gradient-to-br from-gray-900 to-black p-6 rounded-lg border border-gray-800">
            <h3 class="text-lg font-bold text-gray-300 mb-4 flex items-center gap-2">
              <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              General Settings
            </h3>
            
            <div class="space-y-4">
              <!-- Enabled Toggle -->
              <div class="flex items-center justify-between p-3 bg-black/50 rounded border border-gray-800">
                <div>
                  <label class="text-sm font-medium text-gray-300">Trading Enabled</label>
                  <p class="text-xs text-gray-500">Enable/disable all bot trading</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" bind:checked={botSettings.enabled} class="sr-only peer">
                  <div class="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-red-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>

              <!-- Risk Level -->
              <div class="p-3 bg-black/50 rounded border border-gray-800">
                <label class="text-sm font-medium text-gray-300 mb-2 block">Risk Level</label>
                <select bind:value={botSettings.riskLevel} class="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:outline-none focus:border-red-500">
                  <option value="LOW">Low Risk</option>
                  <option value="MEDIUM">Medium Risk</option>
                  <option value="HIGH">High Risk</option>
                </select>
              </div>

              <!-- Max Open Trades -->
              <div class="p-3 bg-black/50 rounded border border-gray-800">
                <label class="text-sm font-medium text-gray-300 mb-2 block">Max Open Trades</label>
                <input type="number" bind:value={botSettings.maxOpenTrades} min="1" max="20" class="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:outline-none focus:border-red-500">
                <p class="text-xs text-gray-500 mt-1">Maximum simultaneous open positions</p>
              </div>
            </div>
          </div>

          <!-- Lot Size Settings -->
          <div class="bg-gradient-to-br from-gray-900 to-black p-6 rounded-lg border border-gray-800">
            <h3 class="text-lg font-bold text-gray-300 mb-4 flex items-center gap-2">
              <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Lot Size & Volume
            </h3>
            
            <div class="space-y-4">
              <!-- Default Lot Size -->
              <div class="p-3 bg-black/50 rounded border border-gray-800">
                <label class="text-sm font-medium text-gray-300 mb-2 block">Default Lot Size</label>
                <input type="number" bind:value={botSettings.lotSize} min="0.01" max="10" step="0.01" class="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:outline-none focus:border-red-500">
                <p class="text-xs text-gray-500 mt-1">Standard trade size (0.01 - 10.0)</p>
              </div>

              <!-- Max Lot Size -->
              <div class="p-3 bg-black/50 rounded border border-gray-800">
                <label class="text-sm font-medium text-gray-300 mb-2 block">Maximum Lot Size</label>
                <input type="number" bind:value={botSettings.maxLotSize} min="0.01" max="100" step="0.01" class="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:outline-none focus:border-red-500">
                <p class="text-xs text-gray-500 mt-1">Maximum allowed lot size</p>
              </div>
            </div>
          </div>

          <!-- Risk Management -->
          <div class="bg-gradient-to-br from-gray-900 to-black p-6 rounded-lg border border-gray-800">
            <h3 class="text-lg font-bold text-gray-300 mb-4 flex items-center gap-2">
              <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Risk Management
            </h3>
            
            <div class="space-y-4">
              <!-- Stop Loss -->
              <div class="p-3 bg-black/50 rounded border border-gray-800">
                <label class="text-sm font-medium text-gray-300 mb-2 block">Stop Loss (pips)</label>
                <input type="number" bind:value={botSettings.stopLoss} min="5" max="500" class="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:outline-none focus:border-red-500">
                <p class="text-xs text-gray-500 mt-1">Default stop loss distance</p>
              </div>

              <!-- Take Profit -->
              <div class="p-3 bg-black/50 rounded border border-gray-800">
                <label class="text-sm font-medium text-gray-300 mb-2 block">Take Profit (pips)</label>
                <input type="number" bind:value={botSettings.takeProfit} min="5" max="1000" class="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:outline-none focus:border-red-500">
                <p class="text-xs text-gray-500 mt-1">Default take profit target</p>
              </div>

              <!-- Maximum Total Loss (Auto Close) -->
              <div class="p-3 bg-red-950/50 rounded border border-red-600/50">
                <label class="text-sm font-medium text-red-400 mb-2 block flex items-center gap-2">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Maximum Loss ($)
                </label>
                <input 
                  type="number" 
                  bind:value={botSettings.maxTotalLoss} 
                  min="1" 
                  max="10000" 
                  step="1" 
                  class="w-full px-4 py-2 bg-gray-900 border border-red-600 rounded text-white focus:outline-none focus:border-red-400 font-semibold"
                >
                <p class="text-xs text-red-300 mt-1 flex items-center gap-1">
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                  </svg>
                  <strong>AUTO-CLOSE:</strong> Bot automatically closes ALL trades when total open losses reach this threshold
                </p>
              </div>

              <!-- Max Loss Per Trade -->
              <div class="p-3 bg-black/50 rounded border border-red-800/50">
                <label class="text-sm font-medium text-red-400 mb-2 block flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Max Loss Per Trade ($)
                </label>
                <input 
                  type="number" 
                  bind:value={botSettings.maxLossPerTrade} 
                  min="1" 
                  max="10000" 
                  step="1" 
                  class="w-full px-4 py-2 bg-gray-900 border border-red-700 rounded text-white focus:outline-none focus:border-red-500"
                >
                <p class="text-xs text-red-400 mt-1">⚠️ Maximum allowed loss per individual trade</p>
              </div>

              <!-- Max Daily Profit -->
              <div class="p-3 bg-black/50 rounded border border-gray-800">
                <label class="text-sm font-medium text-gray-300 mb-2 block">Max Daily Profit ($)</label>
                <input type="number" bind:value={botSettings.maxDailyProfit} min="0" max="100000" step="100" class="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:outline-none focus:border-red-500">
                <p class="text-xs text-gray-500 mt-1">Stop trading if daily profit reaches this</p>
              </div>
            </div>
          </div>

          <!-- Advanced Features -->
          <div class="bg-gradient-to-br from-gray-900 to-black p-6 rounded-lg border border-gray-800">
            <h3 class="text-lg font-bold text-gray-300 mb-4 flex items-center gap-2">
              <svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Advanced Features
            </h3>
            
            <div class="space-y-4">
              <!-- Trailing Stop -->
              <div class="flex items-center justify-between p-3 bg-black/50 rounded border border-gray-800">
                <div>
                  <label class="text-sm font-medium text-gray-300">Trailing Stop</label>
                  <p class="text-xs text-gray-500">Auto-adjust SL as profit grows</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" bind:checked={botSettings.trailingStop} class="sr-only peer">
                  <div class="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {#if botSettings.trailingStop}
                <div class="p-3 bg-black/50 rounded border border-gray-800 ml-4">
                  <label class="text-sm font-medium text-gray-300 mb-2 block">Trailing Distance (pips)</label>
                  <input type="number" bind:value={botSettings.trailingStopDistance} min="5" max="200" class="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:outline-none focus:border-purple-500">
                </div>
              {/if}

              <!-- Break Even -->
              <div class="flex items-center justify-between p-3 bg-black/50 rounded border border-gray-800">
                <div>
                  <label class="text-sm font-medium text-gray-300">Break Even</label>
                  <p class="text-xs text-gray-500">Move SL to entry after profit</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" bind:checked={botSettings.breakEven} class="sr-only peer">
                  <div class="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {#if botSettings.breakEven}
                <div class="p-3 bg-black/50 rounded border border-gray-800 ml-4">
                  <label class="text-sm font-medium text-gray-300 mb-2 block">Break Even at (pips)</label>
                  <input type="number" bind:value={botSettings.breakEvenPips} min="5" max="100" class="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:outline-none focus:border-blue-500">
                </div>
              {/if}
            </div>
          </div>

          <!-- Trading Hours -->
          <div class="bg-gradient-to-br from-gray-900 to-black p-6 rounded-lg border border-gray-800 lg:col-span-2">
            <h3 class="text-lg font-bold text-gray-300 mb-4 flex items-center gap-2">
              <svg class="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Trading Hours & Symbols
            </h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Trading Hours -->
              <div class="p-3 bg-black/50 rounded border border-gray-800">
                <label class="text-sm font-medium text-gray-300 mb-2 block">Trading Start Time</label>
                <input type="time" bind:value={botSettings.tradingHours.start} class="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:outline-none focus:border-yellow-500">
              </div>

              <div class="p-3 bg-black/50 rounded border border-gray-800">
                <label class="text-sm font-medium text-gray-300 mb-2 block">Trading End Time</label>
                <input type="time" bind:value={botSettings.tradingHours.end} class="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:outline-none focus:border-yellow-500">
              </div>

              <!-- Allowed Symbols -->
              <div class="p-3 bg-black/50 rounded border border-gray-800 md:col-span-2">
                <label class="text-sm font-medium text-gray-300 mb-2 block">Allowed Symbols</label>
                <div class="flex flex-wrap gap-2 mb-2">
                  {#each ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD'] as symbol}
                    <label class="flex items-center gap-2 px-3 py-2 bg-gray-900 border border-gray-700 rounded cursor-pointer hover:border-yellow-500 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={botSettings.allowedSymbols.includes(symbol)}
                        on:change={(e) => {
                          if (e.currentTarget.checked) {
                            botSettings.allowedSymbols = [...botSettings.allowedSymbols, symbol];
                          } else {
                            botSettings.allowedSymbols = botSettings.allowedSymbols.filter(s => s !== symbol);
                          }
                        }}
                        class="w-4 h-4 text-yellow-600 bg-gray-900 border-gray-600 rounded focus:ring-yellow-500"
                      >
                      <span class="text-sm text-gray-300">{symbol}</span>
                    </label>
                  {/each}
                </div>
                <p class="text-xs text-gray-500">Select trading pairs to enable</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Info Banner -->
        <div class="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4 flex items-start gap-3">
          <svg class="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div class="text-sm text-gray-300">
            <p class="font-semibold text-blue-400 mb-1">Configuration API Integration</p>
            <p>These settings are sent to the C# Agent via <code class="px-2 py-1 bg-black/50 rounded text-yellow-400">/api/admin/bot-settings</code> endpoint. The agent will apply these parameters to all active trading bots immediately upon saving.</p>
          </div>
        </div>
      </div>
    {/if}
    
    <!-- Leaderboard Tab -->
    {#if activeTab === 'leaderboard'}
      <div class="space-y-6">
        <!-- Header with Sync -->
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-bold mb-2" style="color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);">
              🏆 Leaderboard Management
            </h2>
            {#if lastSyncTime}
              <p class="text-sm text-gray-400">Last synced: {lastSyncTime}</p>
            {/if}
          </div>
          <div class="flex gap-3">
            <button
              on:click={syncLeaderboard}
              disabled={isSyncing}
              class="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-blue-800 transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
            >
              <svg class="w-5 h-5" class:animate-spin={isSyncing} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{isSyncing ? 'Syncing...' : 'Force Sync'}</span>
            </button>
            <button
              on:click={() => editingPrizes = true}
              class="px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-700 text-white rounded-lg font-semibold hover:from-yellow-600 hover:to-yellow-800"
            >
              💰 Configure Prizes
            </button>
          </div>
        </div>

        <!-- Period Tabs -->
        <div class="flex gap-2">
          <button
            on:click={() => { leaderboardPeriod = 'daily'; loadLeaderboard(); }}
            class="px-6 py-3 rounded-lg font-medium transition-all"
            class:bg-gradient-to-r={leaderboardPeriod === 'daily'}
            class:from-red-500={leaderboardPeriod === 'daily'}
            class:to-red-700={leaderboardPeriod === 'daily'}
            class:text-white={leaderboardPeriod === 'daily'}
            class:bg-gray-800={leaderboardPeriod !== 'daily'}
            class:text-gray-400={leaderboardPeriod !== 'daily'}
          >
            📅 Daily
          </button>
          <button
            on:click={() => { leaderboardPeriod = 'weekly'; loadLeaderboard(); }}
            class="px-6 py-3 rounded-lg font-medium transition-all"
            class:bg-gradient-to-r={leaderboardPeriod === 'weekly'}
            class:from-red-500={leaderboardPeriod === 'weekly'}
            class:to-red-700={leaderboardPeriod === 'weekly'}
            class:text-white={leaderboardPeriod === 'weekly'}
            class:bg-gray-800={leaderboardPeriod !== 'weekly'}
            class:text-gray-400={leaderboardPeriod !== 'weekly'}
          >
            📊 Weekly
          </button>
          <button
            on:click={() => { leaderboardPeriod = 'monthly'; loadLeaderboard(); }}
            class="px-6 py-3 rounded-lg font-medium transition-all"
            class:bg-gradient-to-r={leaderboardPeriod === 'monthly'}
            class:from-red-500={leaderboardPeriod === 'monthly'}
            class:to-red-700={leaderboardPeriod === 'monthly'}
            class:text-white={leaderboardPeriod === 'monthly'}
            class:bg-gray-800={leaderboardPeriod !== 'monthly'}
            class:text-gray-400={leaderboardPeriod !== 'monthly'}
          >
            📈 Monthly
          </button>
        </div>

        <!-- Leaderboard Table -->
        <div class="bg-gradient-to-br from-gray-900 to-black rounded-lg border border-gray-800 overflow-hidden">
          <table class="w-full">
            <thead class="bg-black bg-opacity-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Rank</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Trader</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Profit</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Trades</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Win Rate</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Winning/Losing</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-800">
              {#each leaderboardData as entry, idx}
                <tr class="hover:bg-gray-800/50 transition-colors">
                  <td class="px-6 py-4 text-sm">
                    <span class="font-bold text-xl">
                      {#if entry.rank === 1}🥇
                      {:else if entry.rank === 2}🥈
                      {:else if entry.rank === 3}🥉
                      {:else}<span class="text-gray-400">#{entry.rank}</span>
                      {/if}
                    </span>
                  </td>
                  <td class="px-6 py-4">
                    <div class="text-sm font-medium text-white">{entry.userName}</div>
                    <div class="text-xs text-gray-400">{entry.userEmail}</div>
                  </td>
                  <td class="px-6 py-4 text-sm font-bold" class:text-green-400={entry.totalProfit >= 0} class:text-red-400={entry.totalProfit < 0}>
                    ${entry.totalProfit?.toFixed(2) || '0.00'}
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-300">
                    {entry.totalTrades || 0}
                  </td>
                  <td class="px-6 py-4 text-sm">
                    <span class="font-semibold" class:text-green-400={entry.winRate >= 60} class:text-yellow-400={entry.winRate >= 50 && entry.winRate < 60} class:text-red-400={entry.winRate < 50}>
                      {entry.winRate?.toFixed(1) || '0.0'}%
                    </span>
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-400">
                    <span class="text-green-400">{entry.winningTrades || 0}</span> / 
                    <span class="text-red-400">{entry.losingTrades || 0}</span>
                  </td>
                  <td class="px-6 py-4">
                    <button
                      on:click={() => openEditModal(entry)}
                      class="px-3 py-1 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors text-sm"
                    >
                      ✏️ Edit Stats
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
          
          {#if leaderboardData.length === 0}
            <div class="p-12 text-center text-gray-500">
              No leaderboard data available. Click "Force Sync" to refresh.
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <!-- Trades Tab -->
    {#if activeTab === 'trades'}
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-bold" style="color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);">
            Recent Trades
          </h2>
          <button class="px-4 py-2 bg-gradient-to-r from-red-500 to-red-700 text-white rounded-lg font-semibold hover:from-red-600 hover:to-red-800">
            Export CSV
          </button>
        </div>
        
        <!-- Trades Table -->
        <div class="bg-gradient-to-br from-gray-900 to-black rounded-lg border border-gray-800 overflow-hidden">
          <table class="w-full">
            <thead class="bg-black bg-opacity-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">ID</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">User</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Bot</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Symbol</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Type</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Volume</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Entry</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Exit</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Profit</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Time</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-800">
              {#each trades as trade}
                <tr class="hover:bg-gray-800/50 transition-colors">
                  <td class="px-6 py-4 text-sm text-gray-400">#{trade.id}</td>
                  <td class="px-6 py-4 text-sm text-gray-300">{trade.user}</td>
                  <td class="px-6 py-4 text-sm text-gray-400">{trade.bot}</td>
                  <td class="px-6 py-4 text-sm text-gray-300 font-semibold">{trade.symbol}</td>
                  <td class="px-6 py-4">
                    <span class="px-2 py-1 text-xs rounded
                      {trade.type === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}
                    ">
                      {trade.type}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-300">{trade.volume}</td>
                  <td class="px-6 py-4 text-sm text-gray-400">{trade.entry}</td>
                  <td class="px-6 py-4 text-sm text-gray-400">{trade.exit}</td>
                  <td class="px-6 py-4 text-sm font-semibold {trade.profit >= 0 ? 'text-green-400' : 'text-red-400'}">
                    ${trade.profit.toFixed(2)}
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-400">{trade.time}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}
    
    <!-- Automations Tab -->
    {#if activeTab === 'automations'}
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-bold" style="color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);">
            Notification Automations
          </h2>
          <button
            on:click={addAutomation}
            class="px-6 py-3 bg-gradient-to-r from-red-500 to-red-700 text-white rounded-lg font-semibold hover:from-red-600 hover:to-red-800 transition-all duration-200 flex items-center gap-2"
          >
            <span class="text-xl">✨</span>
            <span>Add Automation</span>
          </button>
        </div>
        
        <!-- Stats Cards -->
        {#if !isLoadingAutomations && !automationError}
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="bg-gradient-to-br from-green-900/20 to-black p-6 rounded-lg border border-green-500/30">
              <div class="text-green-400 text-sm font-semibold mb-1">Active Automations</div>
              <div class="text-3xl font-bold text-white">
                {automations.filter(a => a.status === 'ACTIVE').length}
              </div>
            </div>
            <div class="bg-gradient-to-br from-blue-900/20 to-black p-6 rounded-lg border border-blue-500/30">
              <div class="text-blue-400 text-sm font-semibold mb-1">Total Sent</div>
              <div class="text-3xl font-bold text-white">
                {automations.reduce((sum, a) => sum + a.totalSent, 0).toLocaleString()}
              </div>
            </div>
            <div class="bg-gradient-to-br from-purple-900/20 to-black p-6 rounded-lg border border-purple-500/30">
              <div class="text-purple-400 text-sm font-semibold mb-1">Total Triggered</div>
              <div class="text-3xl font-bold text-white">
                {automations.reduce((sum, a) => sum + a.totalTriggered, 0).toLocaleString()}
              </div>
            </div>
            <div class="bg-gradient-to-br from-red-900/20 to-black p-6 rounded-lg border border-red-500/30">
              <div class="text-red-400 text-sm font-semibold mb-1">Failed</div>
              <div class="text-3xl font-bold text-white">
                {automations.reduce((sum, a) => sum + a.totalFailed, 0).toLocaleString()}
              </div>
            </div>
          </div>
        {/if}
        
        <!-- Automation Form -->
        {#if showForm}
          <div class="bg-gradient-to-br from-gray-900 to-black p-8 rounded-lg border-2 border-red-500/30 shadow-2xl">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-2xl font-bold" style="color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);">
                {editingId ? '✏️ Edit Automation' : '✨ Create New Automation'}
              </h3>
              <button
                on:click={closeForm}
                class="text-gray-400 hover:text-white transition-colors"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <!-- Step Indicator -->
            <div class="flex items-center justify-center mb-8 space-x-4">
              <div class="flex items-center">
                <div class="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center font-bold border-2 border-red-400 shadow-lg shadow-red-500/50">
                  1
                </div>
                <span class="ml-2 text-sm font-semibold text-red-400">Trigger</span>
              </div>
              <div class="w-16 h-0.5 bg-gradient-to-r from-red-500 to-blue-500"></div>
              <div class="flex items-center">
                <div class="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold border-2 border-blue-400 shadow-lg shadow-blue-500/50">
                  2
                </div>
                <span class="ml-2 text-sm font-semibold text-blue-400">Action</span>
              </div>
              <div class="w-16 h-0.5 bg-gradient-to-r from-blue-500 to-green-500"></div>
              <div class="flex items-center">
                <div class="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center font-bold border-2 border-green-400 shadow-lg shadow-green-500/50">
                  3
                </div>
                <span class="ml-2 text-sm font-semibold text-green-400">Message</span>
              </div>
            </div>
            
            <div class="space-y-6">
              <!-- Basic Info Section -->
              <div class="bg-black/30 p-6 rounded-lg border border-gray-700/50">
                <h4 class="text-lg font-semibold text-gray-300 mb-4 flex items-center gap-2">
                  <span class="text-2xl">📝</span> Basic Information
                </h4>
                <div class="space-y-4">
                  <!-- Name -->
                  <div>
                    <label class="block text-sm font-semibold text-gray-400 mb-2">Automation Name *</label>
                    <input
                      type="text"
                      bind:value={formData.name}
                      class="w-full px-4 py-3 bg-gray-900 border-2 border-gray-700 rounded-lg text-white focus:outline-none focus:border-red-500 transition-all"
                      placeholder="e.g., Welcome New Users"
                      required
                    />
                  </div>
                  
                  <!-- Description -->
                  <div>
                    <label class="block text-sm font-semibold text-gray-400 mb-2">Description</label>
                    <input
                      type="text"
                      bind:value={formData.description}
                      class="w-full px-4 py-3 bg-gray-900 border-2 border-gray-700 rounded-lg text-white focus:outline-none focus:border-red-500 transition-all"
                      placeholder="What does this automation do?"
                    />
                  </div>
                </div>
              </div>
              
              <!-- Step 1: Trigger Event -->
              <div class="bg-gradient-to-br from-red-900/20 to-black/30 p-6 rounded-lg border-2 border-red-500/30">
                <h4 class="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
                  <span class="text-2xl">⚡</span> Step 1: Choose Trigger Event
                </h4>
                <label class="block text-sm font-semibold text-gray-300 mb-3">When should this automation fire? *</label>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {#each [
                    { value: 'LEAD_OPTIN', label: 'Lead Opt-in', icon: '👤', desc: 'New user signs up' },
                    { value: 'MT5_REGISTRATION', label: 'MT5 Connected', icon: '🔗', desc: 'MT5 account linked' },
                    { value: 'WINNING_TRADES', label: 'Winning Trades', icon: '📈', desc: 'After X wins' },
                    { value: 'LOSING_TRADES', label: 'Losing Trades', icon: '📉', desc: 'After X losses' },
                    { value: 'SUBSCRIPTION_UPGRADE', label: 'Upgraded Plan', icon: '⭐', desc: 'User upgrades' },
                    { value: 'SUBSCRIPTION_EXPIRED', label: 'Plan Expired', icon: '⏰', desc: 'Subscription ends' },
                    { value: 'HIGH_PROFIT_ACHIEVED', label: 'High Profit', icon: '💰', desc: 'Profit milestone' },
                    { value: 'CONSECUTIVE_LOSSES', label: 'Losing Streak', icon: '⚠️', desc: 'Multiple losses' },
                    { value: 'ACCOUNT_INACTIVE', label: 'Inactive User', icon: '💤', desc: 'No activity' },
                    { value: 'TRIAL_ENDING', label: 'Trial Ending', icon: '⏳', desc: 'Trial expires soon' }
                  ] as trigger}
                    <button
                      type="button"
                      on:click={() => formData.triggerType = trigger.value}
                      class="p-4 rounded-lg border-2 transition-all duration-200 text-left hover:scale-105"
                      class:border-red-500={formData.triggerType === trigger.value}
                      class:bg-red-500={formData.triggerType === trigger.value}
                      class:bg-opacity-20={formData.triggerType === trigger.value}
                      class:shadow-lg={formData.triggerType === trigger.value}
                      class:shadow-red-500={formData.triggerType === trigger.value}
                      class:border-gray-700={formData.triggerType !== trigger.value}
                      class:bg-gray-900={formData.triggerType !== trigger.value}
                    >
                      <div class="text-3xl mb-2">{trigger.icon}</div>
                      <div class="text-sm font-bold text-white mb-1">{trigger.label}</div>
                      <div class="text-xs text-gray-400">{trigger.desc}</div>
                    </button>
                  {/each}
                </div>
                
                <!-- Trigger Value (for count-based triggers) -->
                {#if formData.triggerType === 'WINNING_TRADES' || formData.triggerType === 'LOSING_TRADES' || formData.triggerType === 'CONSECUTIVE_LOSSES'}
                  <div class="mt-4 bg-black/50 p-4 rounded-lg border border-gray-700">
                    <label class="block text-sm font-semibold text-gray-300 mb-2">
                      How many trades? *
                    </label>
                    <input
                      type="number"
                      bind:value={formData.triggerValue}
                      min="1"
                      max="100"
                      class="w-full px-4 py-3 bg-gray-900 border-2 border-gray-700 rounded-lg text-white focus:outline-none focus:border-red-500 transition-all"
                      placeholder="e.g., 5"
                    />
                    <p class="mt-2 text-xs text-gray-500">
                      Trigger after this many {formData.triggerType === 'WINNING_TRADES' ? 'winning' : 'losing'} trades
                    </p>
                  </div>
                {/if}
              </div>
              
              <!-- Step 2: Action Channels (Multiple Selection) -->
              <div class="bg-gradient-to-br from-blue-900/20 to-black/30 p-6 rounded-lg border-2 border-blue-500/30">
                <h4 class="text-lg font-semibold text-blue-400 mb-4 flex items-center gap-2">
                  <span class="text-2xl">📬</span> Step 2: Choose Notification Channels
                </h4>
                <label class="block text-sm font-semibold text-gray-300 mb-3">
                  Select one or more channels * 
                  <span class="text-xs text-gray-500">({formData.actionTypes?.length || 0} selected)</span>
                </label>
                <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {#each [
                    { value: 'EMAIL', label: 'Email', icon: '✉️', desc: 'Send via email' },
                    { value: 'SMS', label: 'SMS', icon: '📱', desc: 'Text message' },
                    { value: 'WHATSAPP', label: 'WhatsApp', icon: '💬', desc: 'WhatsApp msg' },
                    { value: 'PUSH_NOTIFICATION', label: 'Push', icon: '🔔', desc: 'Push notification' },
                    { value: 'IN_APP_MESSAGE', label: 'In-App', icon: '💬', desc: 'In-app message' }
                  ] as action}
                    <button
                      type="button"
                      on:click={() => toggleActionType(action.value)}
                      class="p-4 rounded-lg border-2 transition-all duration-200 hover:scale-105 relative"
                      class:border-blue-500={formData.actionTypes?.includes(action.value)}
                      class:bg-blue-500={formData.actionTypes?.includes(action.value)}
                      class:bg-opacity-20={formData.actionTypes?.includes(action.value)}
                      class:shadow-lg={formData.actionTypes?.includes(action.value)}
                      class:shadow-blue-500={formData.actionTypes?.includes(action.value)}
                      class:border-gray-700={!formData.actionTypes?.includes(action.value)}
                      class:bg-gray-900={!formData.actionTypes?.includes(action.value)}
                    >
                      {#if formData.actionTypes?.includes(action.value)}
                        <div class="absolute top-2 right-2 text-green-400 text-xl">✓</div>
                      {/if}
                      <div class="text-3xl mb-2">{action.icon}</div>
                      <div class="text-sm font-bold text-white mb-1">{action.label}</div>
                      <div class="text-xs text-gray-400">{action.desc}</div>
                    </button>
                  {/each}
                </div>
              </div>
              
              <!-- Step 3: Message Content -->
              <div class="bg-gradient-to-br from-green-900/20 to-black/30 p-6 rounded-lg border-2 border-green-500/30">
                <h4 class="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
                  <span class="text-2xl">✍️</span> Step 3: Compose Message
                </h4>
                
                <!-- Message Subject (for Email) -->
                {#if formData.actionTypes?.includes('EMAIL')}
                  <div class="mb-4">
                    <label class="block text-sm font-semibold text-gray-300 mb-2">
                      <span class="text-yellow-400">✉️</span> Email Subject Line
                      {#if !formData.messageSubject?.trim()}
                        <span class="text-xs text-yellow-500 ml-2">(Recommended for emails)</span>
                      {/if}
                    </label>
                    <input
                      type="text"
                      bind:value={formData.messageSubject}
                      class="w-full px-4 py-3 bg-gray-900 border-2 rounded-lg text-white focus:outline-none transition-all"
                      class:border-gray-700={formData.messageSubject?.trim()}
                      class:border-yellow-500={!formData.messageSubject?.trim()}
                      class:focus:border-green-500={formData.messageSubject?.trim()}
                      class:focus:border-yellow-400={!formData.messageSubject?.trim()}
                      placeholder="e.g., Welcome to SCALPERIUM! 🎉"
                    />
                  </div>
                {/if}
                
                <!-- Message Body -->
                <div>
                  <label class="block text-sm font-semibold text-gray-300 mb-2">Message Content *</label>
                  <textarea
                    bind:value={formData.messageBody}
                    rows="6"
                    class="w-full px-4 py-3 bg-gray-900 border-2 border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 transition-all font-mono text-sm"
                    placeholder="Hi {'{firstName}'}!&#10;&#10;Great news! Your account is now active. 🚀&#10;&#10;Start trading now and unlock your potential!&#10;&#10;Best,&#10;SCALPERIUM Team"
                    required
                  ></textarea>
                  <div class="mt-3 p-3 bg-black/50 rounded border border-gray-700">
                    <p class="text-xs font-semibold text-gray-400 mb-2">💡 Available Variables:</p>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      <code class="px-2 py-1 bg-gray-800 text-green-400 rounded">{'{firstName}'}</code>
                      <code class="px-2 py-1 bg-gray-800 text-green-400 rounded">{'{lastName}'}</code>
                      <code class="px-2 py-1 bg-gray-800 text-green-400 rounded">{'{email}'}</code>
                      <code class="px-2 py-1 bg-gray-800 text-green-400 rounded">{'{totalProfit}'}</code>
                      <code class="px-2 py-1 bg-gray-800 text-green-400 rounded">{'{tradeCount}'}</code>
                      <code class="px-2 py-1 bg-gray-800 text-green-400 rounded">{'{winRate}'}</code>
                      <code class="px-2 py-1 bg-gray-800 text-green-400 rounded">{'{accountBalance}'}</code>
                      <code class="px-2 py-1 bg-gray-800 text-green-400 rounded">{'{planName}'}</code>
                    </div>
                    <p class="text-xs text-gray-500 mt-2">✨ Add emojis to make your messages engaging!</p>
                  </div>
                </div>
              </div>
              
              <!-- Advanced Settings -->
              <div class="bg-black/30 p-6 rounded-lg border border-gray-700/50">
                <h4 class="text-lg font-semibold text-gray-300 mb-4 flex items-center gap-2">
                  <span class="text-2xl">⚙️</span> Advanced Settings
                </h4>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-semibold text-gray-400 mb-2">
                      Priority Level
                    </label>
                    <select
                      bind:value={formData.priority}
                      class="w-full px-4 py-3 bg-gray-900 border-2 border-gray-700 rounded-lg text-white focus:outline-none focus:border-red-500 transition-all"
                    >
                      <option value={10}>🔴 Critical (10)</option>
                      <option value={9}>High (9)</option>
                      <option value={8}>High (8)</option>
                      <option value={7}>Medium-High (7)</option>
                      <option value={6}>Medium-High (6)</option>
                      <option value={5}>🟡 Normal (5)</option>
                      <option value={4}>Medium-Low (4)</option>
                      <option value={3}>Medium-Low (3)</option>
                      <option value={2}>Low (2)</option>
                      <option value={1}>🟢 Low (1)</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-gray-400 mb-2">
                      Initial Status
                    </label>
                    <select
                      bind:value={formData.status}
                      class="w-full px-4 py-3 bg-gray-900 border-2 border-gray-700 rounded-lg text-white focus:outline-none focus:border-red-500 transition-all"
                    >
                      <option value="ACTIVE">✅ Active (Start immediately)</option>
                      <option value="PAUSED">⏸️ Paused (Save as draft)</option>
                      <option value="ARCHIVED">📦 Archived</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <!-- Action Buttons -->
              <div class="flex gap-4 justify-between items-center pt-6 border-t border-gray-800">
                <button
                  type="button"
                  on:click={closeForm}
                  disabled={isSaving}
                  class="px-6 py-3 border-2 border-gray-700 text-gray-400 rounded-lg hover:bg-gray-800 hover:border-gray-600 transition-all duration-200 disabled:opacity-50 font-semibold"
                >
                  ✖ Cancel
                </button>
                <button
                  type="button"
                  on:click={saveAutomation}
                  disabled={isSaving || !formData.name || !formData.messageBody || !formData.actionTypes?.length}
                  class="px-8 py-3 bg-gradient-to-r from-red-500 to-red-700 text-white rounded-lg font-bold text-lg hover:from-red-600 hover:to-red-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 shadow-lg shadow-red-500/50"
                >
                  {#if isSaving}
                    <svg class="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Saving...</span>
                  {:else}
                    <span class="text-2xl">💾</span>
                    <span>{editingId ? '✏️ Update' : '✨ Create'} Automation</span>
                  {/if}
                </button>
              </div>
              
              <!-- Validation Hint - Only shows when fields are empty -->
              {#if !isSaving && (!formData.name || !formData.messageBody || !formData.actionTypes?.length)}
                <p class="text-center text-sm text-yellow-500 flex items-center justify-center gap-2 animate-pulse">
                  <span>⚠️</span>
                  <span>
                    {#if !formData.name && !formData.messageBody && !formData.actionTypes?.length}
                      Please fill in all required fields
                    {:else}
                      Missing: 
                      {#if !formData.name}<span class="font-semibold">Name</span>{/if}
                      {#if !formData.name && !formData.messageBody}, {/if}
                      {#if !formData.messageBody}<span class="font-semibold">Message</span>{/if}
                      {#if (!formData.name || !formData.messageBody) && !formData.actionTypes?.length}, {/if}
                      {#if !formData.actionTypes?.length}<span class="font-semibold">Channel</span>{/if}
                    {/if}
                  </span>
                </p>
              {/if}
            </div>
          </div>
        {/if}
        
        <!-- Loading State -->
        {#if isLoadingAutomations}
          <div class="bg-gradient-to-br from-gray-900 to-black p-8 rounded-lg border border-gray-800 text-center">
            <svg class="animate-spin h-10 w-10 mx-auto mb-4 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p class="text-gray-400">Loading automations...</p>
          </div>
        {:else if automationError}
          <div class="bg-gradient-to-br from-red-900 to-black p-6 rounded-lg border border-red-800 text-center">
            <p class="text-red-400">{automationError}</p>
            <button
              on:click={loadAutomations}
              class="mt-4 px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              Retry
            </button>
          </div>
        {:else if automations.length === 0}
          <div class="bg-gradient-to-br from-gray-900 to-black p-8 rounded-lg border border-gray-800 text-center">
            <p class="text-gray-400 mb-4">No automations created yet. Click "Add Automation" to get started!</p>
          </div>
        {:else}
          <!-- Automation List -->
          <div class="space-y-4">
            {#each automations as automation}
              <div class="bg-gradient-to-br from-gray-900 to-black p-6 rounded-lg border border-gray-800">
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center gap-3 mb-2">
                      <h3 class="text-lg font-semibold text-gray-300">{automation.name}</h3>
                      <div class="flex gap-1">
                        {#each (automation.actionTypes || []) as actionType}
                          <span class="text-xl">{getActionIcon(actionType)}</span>
                        {/each}
                      </div>
                      {#if automation.status === 'ACTIVE'}
                        <span class="px-3 py-1 bg-green-500 bg-opacity-20 text-green-500 text-xs rounded-full border border-green-500">
                          Active
                        </span>
                      {:else if automation.status === 'PAUSED'}
                        <span class="px-3 py-1 bg-yellow-500 bg-opacity-20 text-yellow-500 text-xs rounded-full border border-yellow-500">
                          Paused
                        </span>
                      {:else}
                        <span class="px-3 py-1 bg-gray-500 bg-opacity-20 text-gray-500 text-xs rounded-full border border-gray-500">
                          Archived
                        </span>
                      {/if}
                    </div>
                    
                    {#if automation.description}
                      <p class="text-sm text-gray-500 mb-3">{automation.description}</p>
                    {/if}
                    
                    <div class="flex items-center gap-4 text-sm text-gray-500 mb-3">
                      <div>
                        <span class="font-semibold text-gray-400">Trigger:</span>
                        {getTriggerLabel(automation.triggerType, automation.triggerValue)}
                      </div>
                      <div>
                        <span class="font-semibold text-gray-400">Channels:</span>
                        {#if automation.actionTypes && automation.actionTypes.length > 0}
                          {automation.actionTypes.join(', ')}
                        {:else}
                          None
                        {/if}
                      </div>
                      <div>
                        <span class="font-semibold text-gray-400">Sent:</span>
                        {automation.totalSent.toLocaleString()}
                      </div>
                      {#if automation.totalFailed > 0}
                        <div>
                          <span class="font-semibold text-red-400">Failed:</span>
                          {automation.totalFailed.toLocaleString()}
                        </div>
                      {/if}
                    </div>
                    
                    <p class="text-gray-400 text-sm bg-black bg-opacity-50 p-3 rounded border border-gray-800 mt-2">
                      {automation.messageBody}
                    </p>
                  </div>
                  
                  <div class="flex items-center gap-3 ml-4">
                    <button
                      on:click={() => toggleAutomation(automation.id)}
                      class="px-4 py-2 rounded-lg border border-gray-700 hover:bg-gray-800 transition-all duration-200"
                    >
                      {automation.status === 'ACTIVE' ? 'Pause' : 'Activate'}
                    </button>
                    <button
                      on:click={() => editAutomation(automation)}
                      class="px-4 py-2 bg-blue-500 bg-opacity-20 text-blue-500 border border-blue-500 rounded-lg hover:bg-opacity-30 transition-all duration-200"
                    >
                      Edit
                    </button>
                    <button
                      on:click={() => deleteAutomation(automation.id)}
                      class="px-4 py-2 bg-red-500 bg-opacity-20 text-red-500 border border-red-500 rounded-lg hover:bg-opacity-30 transition-all duration-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
        
        <!-- Activity Logs Section -->
        <div class="mt-8">
          <h3 class="text-xl font-semibold mb-4" style="color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);">
            Activity Logs
          </h3>
          <div class="bg-gradient-to-br from-gray-900 to-black rounded-lg border border-gray-800 overflow-hidden">
            <table class="w-full">
              <thead class="bg-black bg-opacity-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Trigger
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Action
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-800">
                {#each activityLogs as log}
                  <tr class="hover:bg-gray-800 hover:bg-opacity-30 transition-all duration-200">
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {log.timestamp}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {log.user}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {log.trigger}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {log.action}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                      {#if log.status === 'sent'}
                        <span class="px-3 py-1 bg-green-500 bg-opacity-20 text-green-500 text-xs rounded-full border border-green-500">
                          Sent
                        </span>
                      {:else}
                        <span class="px-3 py-1 bg-red-500 bg-opacity-20 text-red-500 text-xs rounded-full border border-red-500">
                          Failed
                        </span>
                      {/if}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  /* Custom scrollbar for dark theme */
  :global(body) {
    scrollbar-width: thin;
    scrollbar-color: #374151 #000000;
  }
  
  :global(body::-webkit-scrollbar) {
    width: 8px;
  }
  
  :global(body::-webkit-scrollbar-track) {
    background: #000000;
  }
  
  :global(body::-webkit-scrollbar-thumb) {
    background-color: #374151;
    border-radius: 4px;
  }
</style>

<!-- Edit User Stats Modal -->
{#if showEditModal && editingUser}
  <div class="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
    <div class="bg-gradient-to-br from-gray-900 to-black rounded-xl border border-red-500/30 max-w-2xl w-full p-8">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-2xl font-bold" style="color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);">
          ✏️ Edit Trader Stats
        </h3>
        <button on:click={() => showEditModal = false} class="p-2 hover:bg-gray-800 rounded-lg">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div class="space-y-4 mb-6">
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Trader Name</label>
          <input
            type="text"
            bind:value={editingUser.userName}
            disabled
            class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white opacity-50 cursor-not-allowed"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Total Profit ($)</label>
          <input
            type="number"
            step="0.01"
            bind:value={editingUser.totalProfit}
            class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
          />
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Total Trades</label>
            <input
              type="number"
              bind:value={editingUser.totalTrades}
              class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Win Rate (%)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              bind:value={editingUser.winRate}
              class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
            />
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Winning Trades</label>
            <input
              type="number"
              bind:value={editingUser.winningTrades}
              class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Losing Trades</label>
            <input
              type="number"
              bind:value={editingUser.losingTrades}
              class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
            />
          </div>
        </div>
      </div>
      
      <div class="flex gap-3">
        <button
          on:click={saveUserStats}
          class="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-green-700 text-white rounded-lg font-semibold hover:from-green-600 hover:to-green-800"
        >
          💾 Save Changes
        </button>
        <button
          on:click={() => showEditModal = false}
          class="px-6 py-3 bg-gray-800 text-gray-300 rounded-lg font-semibold hover:bg-gray-700"
        >
          Cancel
        </button>
      </div>
      
      <div class="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
        <p class="text-sm text-yellow-400">
          ⚠️ <strong>Warning:</strong> Manual edits will override calculated stats. Use for testing or corrections only.
        </p>
      </div>
    </div>
  </div>
{/if}

<!-- IB Partners Tab -->
{#if activeTab === 'ib-partners'}
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h2 class="text-2xl font-bold" style="color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);">
        🤝 IB Partner Management
      </h2>
      <div class="flex gap-3">
        <button
          on:click={() => loadIBPartners()}
          class="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-blue-800 transition-all duration-200 flex items-center gap-2"
        >
          <span class="text-xl">🔄</span>
          <span>Refresh</span>
        </button>
      </div>
    </div>

    <!-- IB Partners Table -->
    <div class="bg-gradient-to-br from-gray-900 to-black rounded-lg border border-gray-800 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-800 border-b border-gray-700">
            <tr>
              <th class="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Company
              </th>
              <th class="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Contact
              </th>
              <th class="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                IB Code
              </th>
              <th class="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Traders
              </th>
              <th class="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th class="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                White Label
              </th>
              <th class="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-800">
            <!-- Sample IB Partners (mock data) -->
            <tr class="hover:bg-gray-800/50 transition-colors">
              <td class="px-6 py-4">
                <div class="text-sm font-medium text-white">ABC Trading Ltd</div>
                <div class="text-xs text-gray-400">abc@trading.com</div>
              </td>
              <td class="px-6 py-4">
                <div class="text-sm text-gray-300">John Smith</div>
                <div class="text-xs text-gray-500">+1 555-1234</div>
              </td>
              <td class="px-6 py-4">
                <code class="px-3 py-1 bg-blue-500/20 text-blue-400 rounded font-mono text-sm">
                  IB2024ABC
                </code>
              </td>
              <td class="px-6 py-4 text-sm text-gray-300">
                247
              </td>
              <td class="px-6 py-4">
                <span class="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-semibold">
                  ✓ Active
                </span>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded bg-blue-500/20 border border-blue-500/50"></div>
                  <div class="text-xs">
                    <div class="text-gray-300">trading.pro</div>
                    <div class="text-gray-500">Custom domain</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="flex gap-2">
                  <button
                    class="px-3 py-1 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded text-xs"
                  >
                    ⚙️ Configure
                  </button>
                  <button
                    class="px-3 py-1 bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 rounded text-xs"
                  >
                    ⏸️ Pause
                  </button>
                </div>
              </td>
            </tr>
            
            <!-- Pending IB Application -->
            <tr class="hover:bg-gray-800/50 transition-colors">
              <td class="px-6 py-4">
                <div class="text-sm font-medium text-white">Global FX Partners</div>
                <div class="text-xs text-gray-400">info@globalfx.com</div>
              </td>
              <td class="px-6 py-4">
                <div class="text-sm text-gray-300">Sarah Johnson</div>
                <div class="text-xs text-gray-500">+44 20-7123-4567</div>
              </td>
              <td class="px-6 py-4">
                <code class="px-3 py-1 bg-gray-700 text-gray-400 rounded font-mono text-sm">
                  IB2024GFX
                </code>
              </td>
              <td class="px-6 py-4 text-sm text-gray-500">
                -
              </td>
              <td class="px-6 py-4">
                <span class="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-semibold">
                  ⏳ Pending
                </span>
              </td>
              <td class="px-6 py-4 text-xs text-gray-500">
                Not configured
              </td>
              <td class="px-6 py-4">
                <div class="flex gap-2">
                  <button
                    class="px-3 py-1 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded text-xs"
                  >
                    ✓ Approve
                  </button>
                  <button
                    class="px-3 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded text-xs"
                  >
                    ✗ Reject
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- IB Configuration Instructions -->
    <div class="bg-gradient-to-br from-blue-900/20 to-black rounded-lg border border-blue-500/30 p-6">
      <h3 class="text-lg font-bold text-blue-400 mb-4">
        🔧 White Label Configuration
      </h3>
      <div class="space-y-3 text-sm text-gray-300">
        <p><strong>To configure white-label settings for an IB partner:</strong></p>
        <ol class="list-decimal list-inside space-y-2 ml-4">
          <li>Click "⚙️ Configure" on the IB partner row</li>
          <li>Set custom domain (e.g., trading.yourpartner.com)</li>
          <li>Upload their logo (recommended: 200x60px PNG)</li>
          <li>Upload their favicon (recommended: 32x32px)</li>
          <li>Choose brand color (hex code)</li>
          <li>Save and deploy changes</li>
        </ol>
        <div class="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded">
          <p class="text-yellow-400 text-xs">
            <strong>Note:</strong> Domain DNS configuration requires CNAME record pointing to scalperium.com.
            Provide DNS instructions to IB partner after approval.
          </p>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Prize Configuration Modal -->
{#if editingPrizes}
  <div class="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
    <div class="bg-gradient-to-br from-gray-900 to-black rounded-xl border border-yellow-500/30 max-w-3xl w-full p-8">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-2xl font-bold" style="color: #9ca3af; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);">
          💰 Configure Prize Tiers
        </h3>
        <button on:click={() => editingPrizes = false} class="p-2 hover:bg-gray-800 rounded-lg">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div class="space-y-6 mb-6">
        <!-- Daily Prizes -->
        <div class="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
          <h4 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
            📅 Daily Prizes
          </h4>
          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-yellow-400 mb-2">🥇 1st Place</label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  bind:value={prizes.daily.first}
                  class="w-full pl-8 pr-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-yellow-500"
                />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">🥈 2nd Place</label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  bind:value={prizes.daily.second}
                  class="w-full pl-8 pr-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-gray-500"
                />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-orange-300 mb-2">🥉 3rd Place</label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  bind:value={prizes.daily.third}
                  class="w-full pl-8 pr-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-orange-500"
                />
              </div>
            </div>
          </div>
        </div>
        
        <!-- Weekly Prizes -->
        <div class="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
          <h4 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
            📊 Weekly Prizes
          </h4>
          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-yellow-400 mb-2">🥇 1st Place</label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  bind:value={prizes.weekly.first}
                  class="w-full pl-8 pr-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-yellow-500"
                />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">🥈 2nd Place</label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  bind:value={prizes.weekly.second}
                  class="w-full pl-8 pr-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-gray-500"
                />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-orange-300 mb-2">🥉 3rd Place</label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  bind:value={prizes.weekly.third}
                  class="w-full pl-8 pr-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-orange-500"
                />
              </div>
            </div>
          </div>
        </div>
        
        <!-- Monthly Prizes -->
        <div class="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
          <h4 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
            📈 Monthly Prizes
          </h4>
          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-yellow-400 mb-2">🥇 1st Place</label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  bind:value={prizes.monthly.first}
                  class="w-full pl-8 pr-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-yellow-500"
                />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">🥈 2nd Place</label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  bind:value={prizes.monthly.second}
                  class="w-full pl-8 pr-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-gray-500"
                />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-orange-300 mb-2">🥉 3rd Place</label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  bind:value={prizes.monthly.third}
                  class="w-full pl-8 pr-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-orange-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="flex gap-3">
        <button
          on:click={savePrizes}
          class="flex-1 px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-700 text-white rounded-lg font-semibold hover:from-yellow-600 hover:to-yellow-800"
        >
          💾 Save Prize Configuration
        </button>
        <button
          on:click={() => editingPrizes = false}
          class="px-6 py-3 bg-gray-800 text-gray-300 rounded-lg font-semibold hover:bg-gray-700"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
{/if}
