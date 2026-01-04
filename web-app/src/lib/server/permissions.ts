/**
 * ROLE-BASED ACCESS CONTROL (RBAC)
 * 
 * Hierarchy:
 * SUPER_ADMIN > ADMIN > IB > USER
 * 
 * Access Rules:
 * - SUPER_ADMIN: Full system access, can manage IBs and Admins
 * - ADMIN: Can manage users, view all data, configure system (but not IBs)
 * - IB: Can only see their own users and earnings, limited admin features
 * - USER: Can only see their own data
 */

export enum Permission {
	// User Management
	VIEW_ALL_USERS = 'view_all_users',
	VIEW_IB_USERS = 'view_ib_users',        // IB can only see their users
	VIEW_OWN_DATA = 'view_own_data',
	EDIT_USER = 'edit_user',
	DELETE_USER = 'delete_user',
	
	// IB Management
	VIEW_ALL_IBS = 'view_all_ibs',
	MANAGE_IBS = 'manage_ibs',              // Approve, configure, delete IBs
	VIEW_IB_REVENUE = 'view_ib_revenue',    // IB sees their own revenue
	
	// Agent Management
	VIEW_ALL_AGENTS = 'view_all_agents',
	VIEW_IB_AGENTS = 'view_ib_agents',      // IB sees agents of their users
	VIEW_OWN_AGENTS = 'view_own_agents',
	MANAGE_AGENTS = 'manage_agents',
	
	// Leaderboard
	EDIT_LEADERBOARD = 'edit_leaderboard',  // Admin can manually adjust stats
	VIEW_LEADERBOARD = 'view_leaderboard',
	
	// Prizes
	MANAGE_PRIZES = 'manage_prizes',
	
	// Automations
	CREATE_GLOBAL_AUTOMATION = 'create_global_automation',
	VIEW_ALL_AUTOMATIONS = 'view_all_automations',
	MANAGE_OWN_AUTOMATIONS = 'manage_own_automations',
	
	// System
	VIEW_SYSTEM_LOGS = 'view_system_logs',
	MANAGE_SYSTEM_CONFIG = 'manage_system_config',
	
	// Trades & Accounts
	VIEW_ALL_TRADES = 'view_all_trades',
	VIEW_IB_TRADES = 'view_ib_trades',      // IB sees trades of their users
	VIEW_OWN_TRADES = 'view_own_trades',
}

const rolePermissions: Record<string, Permission[]> = {
	SUPER_ADMIN: [
		// Everything
		Permission.VIEW_ALL_USERS,
		Permission.EDIT_USER,
		Permission.DELETE_USER,
		Permission.VIEW_ALL_IBS,
		Permission.MANAGE_IBS,
		Permission.VIEW_ALL_AGENTS,
		Permission.MANAGE_AGENTS,
		Permission.EDIT_LEADERBOARD,
		Permission.VIEW_LEADERBOARD,
		Permission.MANAGE_PRIZES,
		Permission.CREATE_GLOBAL_AUTOMATION,
		Permission.VIEW_ALL_AUTOMATIONS,
		Permission.MANAGE_OWN_AUTOMATIONS,
		Permission.VIEW_SYSTEM_LOGS,
		Permission.MANAGE_SYSTEM_CONFIG,
		Permission.VIEW_ALL_TRADES,
	],
	
	ADMIN: [
		// User management (but not IB partners)
		Permission.VIEW_ALL_USERS,
		Permission.EDIT_USER,
		Permission.DELETE_USER,
		
		// Agent management
		Permission.VIEW_ALL_AGENTS,
		Permission.MANAGE_AGENTS,
		
		// Leaderboard & Prizes
		Permission.EDIT_LEADERBOARD,
		Permission.VIEW_LEADERBOARD,
		Permission.MANAGE_PRIZES,
		
		// Automations
		Permission.CREATE_GLOBAL_AUTOMATION,
		Permission.VIEW_ALL_AUTOMATIONS,
		Permission.MANAGE_OWN_AUTOMATIONS,
		
		// System
		Permission.VIEW_SYSTEM_LOGS,
		Permission.MANAGE_SYSTEM_CONFIG,
		
		// Trades
		Permission.VIEW_ALL_TRADES,
	],
	
	IB: [
		// Can only see their own users
		Permission.VIEW_IB_USERS,
		Permission.VIEW_OWN_DATA,
		
		// Can see agents of their users
		Permission.VIEW_IB_AGENTS,
		
		// Can see their revenue stats
		Permission.VIEW_IB_REVENUE,
		
		// Can view leaderboard
		Permission.VIEW_LEADERBOARD,
		
		// Can see trades of their users
		Permission.VIEW_IB_TRADES,
		
		// Own automations only
		Permission.MANAGE_OWN_AUTOMATIONS,
	],
	
	USER: [
		// Only own data
		Permission.VIEW_OWN_DATA,
		Permission.VIEW_OWN_AGENTS,
		Permission.VIEW_OWN_TRADES,
		Permission.VIEW_LEADERBOARD,
		Permission.MANAGE_OWN_AUTOMATIONS,
	],
	
	TRADER: [
		// Same as USER
		Permission.VIEW_OWN_DATA,
		Permission.VIEW_OWN_AGENTS,
		Permission.VIEW_OWN_TRADES,
		Permission.VIEW_LEADERBOARD,
		Permission.MANAGE_OWN_AUTOMATIONS,
	],
};

/**
 * Check if user has specific permission
 */
export function hasPermission(userRole: string, permission: Permission): boolean {
	const permissions = rolePermissions[userRole] || [];
	return permissions.includes(permission);
}

/**
 * Check if user can access another user's data
 */
export function canAccessUser(
	requestingUser: { id: string; role: string; ibPartnerId?: string | null },
	targetUserId: string,
	targetUserIbId?: string | null
): boolean {
	// User can always access their own data
	if (requestingUser.id === targetUserId) {
		return true;
	}
	
	// Super Admin and Admin can access anyone
	if (requestingUser.role === 'SUPER_ADMIN' || requestingUser.role === 'ADMIN') {
		return true;
	}
	
	// IB can access their users
	if (requestingUser.role === 'IB' && requestingUser.id === targetUserIbId) {
		return true;
	}
	
	return false;
}

/**
 * Check if user can access IB partner data
 */
export function canAccessIBPartner(
	requestingUser: { id: string; role: string },
	ibPartnerId: string
): boolean {
	// Super Admin can access all IB data
	if (requestingUser.role === 'SUPER_ADMIN') {
		return true;
	}
	
	// IB can only access their own data
	if (requestingUser.role === 'IB' && requestingUser.id === ibPartnerId) {
		return true;
	}
	
	return false;
}

/**
 * Get data filtering based on user role
 * Returns Prisma where clause
 */
export function getDataFilter(user: { id: string; role: string; ibPartnerId?: string | null }) {
	// Super Admin and Admin see everything
	if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
		return {};
	}
	
	// IB sees only their users
	if (user.role === 'IB') {
		return {
			ibPartnerId: user.id
		};
	}
	
	// Regular user sees only their own data
	return {
		userId: user.id
	};
}

/**
 * Require specific permission or throw error
 */
export function requirePermission(userRole: string, permission: Permission) {
	if (!hasPermission(userRole, permission)) {
		throw new Error(`Unauthorized: Missing permission ${permission}`);
	}
}

/**
 * Check if user is admin or super admin
 */
export function isAdmin(userRole: string): boolean {
	return userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
}

/**
 * Check if user is IB partner
 */
export function isIBPartner(userRole: string): boolean {
	return userRole === 'IB';
}

/**
 * Check if user is super admin
 */
export function isSuperAdmin(userRole: string): boolean {
	return userRole === 'SUPER_ADMIN';
}
