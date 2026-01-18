import type { Handle } from '@sveltejs/kit';
import { getSessionUser } from '$lib/server/auth';
import { wsServer } from '$lib/server/websocket-server';
import { building } from '$app/environment';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// WebSocket Server Initialization
// ============================================================================

/**
 * Initialize WebSocket server on application startup
 * Only runs in server environment, not during build
 */
let wsInitialized = false;

async function initializeWebSocket(): Promise<void> {
	if (wsInitialized || building) {
		return;
	}

	try {
		await wsServer.start();
		wsInitialized = true;
		console.log('[hooks.server] WebSocket server initialized');
	} catch (error) {
		// If port is already in use (hot reload), log and continue
		if ((error as NodeJS.ErrnoException).code === 'EADDRINUSE') {
			console.log('[hooks.server] WebSocket server already running (hot reload detected)');
			wsInitialized = true;
		} else {
			console.error('[hooks.server] Failed to initialize WebSocket server:', error);
		}
	}
}

// Initialize on module load (server startup)
initializeWebSocket();

// ============================================================================
// Graceful Shutdown
// ============================================================================

async function gracefulShutdown(signal: string): Promise<void> {
	console.log(`[hooks.server] Received ${signal}, initiating graceful shutdown...`);

	try {
		await wsServer.stop();
		console.log('[hooks.server] WebSocket server stopped');
	} catch (error) {
		console.error('[hooks.server] Error during shutdown:', error);
	}

	process.exit(0);
}

// Register shutdown handlers (only once)
if (!building && typeof process !== 'undefined') {
	process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));
	process.once('SIGINT', () => gracefulShutdown('SIGINT'));
}

// ============================================================================
// Request Handler
// ============================================================================

export const handle: Handle = async ({ event, resolve }) => {
	// ============================================================================
	// White-Label Domain Detection
	// ============================================================================

	const hostname = event.url.hostname;

	// Skip white-label detection for localhost and default Vercel domains
	const isLocalhost = hostname === 'localhost' || hostname.startsWith('127.0.0.1');
	const isVercelDomain = hostname.includes('.vercel.app') || hostname.includes('scalperium.com');

	if (!isLocalhost && !isVercelDomain) {
		try {
			// Look up IB partner by custom domain
			const ibPartner = await prisma.iBPartner.findFirst({
				where: {
					domain: hostname,
					isActive: true,
					isApproved: true
				},
				select: {
					id: true,
					companyName: true,
					brandName: true,
					brandColor: true,
					logo: true,
					favicon: true,
					ibCode: true
				}
			});

			if (ibPartner) {
				// Store white-label branding in event.locals for use in pages
				event.locals.whiteLabel = {
					partnerId: ibPartner.id,
					brandName: ibPartner.brandName || ibPartner.companyName,
					brandColor: ibPartner.brandColor,
					logo: ibPartner.logo,
					favicon: ibPartner.favicon,
					ibCode: ibPartner.ibCode
				};
			}
		} catch (error) {
			console.error('[hooks.server] White-label lookup error:', error);
			// Continue with default branding on error
		}
	}

	// ============================================================================
	// Session Management
	// ============================================================================

	// Get session using unified session helper (supports backward compatibility)
	const sessionUser = getSessionUser(event.cookies);

	if (sessionUser) {
		event.locals.user = sessionUser;
	}

	// ============================================================================
	// Role-Based Route Protection
	// ============================================================================

	const path = event.url.pathname;

	// Public routes (no auth required)
	const publicRoutes = ['/', '/login', '/register', '/ib-login', '/ib-register', '/ib-verify', '/verify-email'];
	const publicApiRoutes = [
		'/api/auth/login',
		'/api/auth/register',
		'/api/auth/logout',
		'/api/auth/verify-email',
		'/api/auth/emergency-reset',
		'/api/ib/login',
		'/api/ib/register',
		'/api/ib/upload',
		'/api/ib/verify-email',
		// Agent API routes (authenticated via API key, not session)
		'/api/webhook/trades',
		'/api/webhook/status',
		'/api/commands'
	];

	if (publicRoutes.includes(path) || publicApiRoutes.some(route => path.startsWith(route))) {
		return resolve(event);
	}

	// Protected routes - require authentication
	if (!sessionUser) {
		// Not authenticated - redirect to login
		if (path.startsWith('/api/')) {
			// API routes return 401
			return new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
		}
		// Regular routes redirect to login
		return Response.redirect(new URL('/login', event.url.origin), 302);
	}

	// Role checks
	const isAdmin = sessionUser.role === 'SUPER_ADMIN' || sessionUser.role === 'ADMIN';
	const isIB = sessionUser.role === 'IB';
	const isRegularUser = sessionUser.role === 'TRADER'; // All regular trading users

	// Admin-only routes
	const adminOnlyRoutes = ['/admin', '/agents', '/automations', '/ib-partners'];
	const isAdminRoute = adminOnlyRoutes.some(route => path.startsWith(route));
	if (isAdminRoute && !isAdmin) {
		// Not admin - redirect to dashboard
		return Response.redirect(new URL('/dashboard', event.url.origin), 302);
	}

	// Admin-only documentation
	if (path.startsWith('/docs/agent-setup') && !isAdmin) {
		return Response.redirect(new URL('/dashboard', event.url.origin), 302);
	}

	// IB-only routes
	if (path.startsWith('/ib-dashboard') && !isIB) {
		// Not IB - redirect to dashboard
		return Response.redirect(new URL('/dashboard', event.url.origin), 302);
	}

	// Leaderboard - only for admin and IB
	if (path.startsWith('/leaderboard') && !isAdmin && !isIB) {
		return Response.redirect(new URL('/dashboard', event.url.origin), 302);
	}

	return resolve(event);
};
