import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Mock user database - simple auth for demo
const mockUsers = [
	{
		id: 1,
		email: 'trader@scalperium.com',
		password: 'Trader123!',
		name: 'Trader Demo',
		broker: 'Exness',
		role: 'trader',
		isActive: true
	},
	{
		id: 2,
		email: 'vip@scalperium.com',
		password: 'VIP123!',
		name: 'VIP Trader',
		broker: 'PrimeXBT',
		role: 'vip',
		isActive: true
	},
	{
		id: 3,
		email: 'demo@scalperium.com',
		password: 'Demo123!',
		name: 'Demo Account',
		broker: 'Exness',
		role: 'trader',
		isActive: true
	},
	{
		id: 4,
		email: 'pro@scalperium.com',
		password: 'Pro123!',
		name: 'Pro Trader',
		broker: 'Exness',
		role: 'trader',
		isActive: true
	},
	{
		id: 999,
		email: 'admin@scalperium.com',
		password: 'Admin123!',
		name: 'System Admin',
		broker: 'System',
		role: 'admin',
		isActive: true
	}
];

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const { email, password, broker } = await request.json();

		console.log('Login attempt:', { email, broker });

		// Validate input
		if (!email || !password) {
			return json({ success: false, error: 'Email and password are required' }, { status: 400 });
		}

		// Find user with simple password check (mock auth)
		const user = mockUsers.find(
			(u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
		);

		console.log('User found:', user ? 'Yes' : 'No', user?.role);

		if (!user || !user.isActive) {
			return json({ success: false, error: 'Invalid credentials' }, { status: 401 });
		}

		// Set simple session cookie (mock auth)
		cookies.set('user_session', JSON.stringify({
			id: user.id,
			email: user.email,
			name: user.name,
			broker: user.broker || broker,
			role: user.role
		}), {
			path: '/',
			httpOnly: true,
			sameSite: 'strict',
			secure: false, // Set to true in production
			maxAge: 60 * 60 * 24 * 7 // 7 days
		});

		return json({
			success: true,
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				broker: user.broker || broker,
				role: user.role
			}
		});
	} catch (error) {
		console.error('Login error:', error);
		return json({ success: false, error: 'Login failed' }, { status: 500 });
	}
};
