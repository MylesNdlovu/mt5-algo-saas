import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import fs from 'fs';
import path from 'path';

const PRIZES_FILE = path.join(process.cwd(), 'data', 'prizes.json');

function ensureDataDir() {
	const dataDir = path.join(process.cwd(), 'data');
	if (!fs.existsSync(dataDir)) {
		fs.mkdirSync(dataDir, { recursive: true });
	}
}

function loadPrizes() {
	ensureDataDir();
	
	if (!fs.existsSync(PRIZES_FILE)) {
		const defaultPrizes = {
			daily: { first: 100, second: 50, third: 25 },
			weekly: { first: 500, second: 250, third: 100 },
			monthly: { first: 2000, second: 1000, third: 500 }
		};
		fs.writeFileSync(PRIZES_FILE, JSON.stringify(defaultPrizes, null, 2));
		return defaultPrizes;
	}
	
	const data = fs.readFileSync(PRIZES_FILE, 'utf-8');
	return JSON.parse(data);
}

function savePrizes(prizes: any) {
	ensureDataDir();
	fs.writeFileSync(PRIZES_FILE, JSON.stringify(prizes, null, 2));
}

export const GET: RequestHandler = async ({ cookies }) => {
	// Check authentication
	const userSession = cookies.get('user_session');
	if (!userSession) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const prizes = loadPrizes();
		return json({ prizes });
	} catch (error) {
		console.error('Error loading prizes:', error);
		return json({ error: 'Failed to load prizes' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, cookies }) => {
	// Check authentication
	const userSession = cookies.get('user_session');
	if (!userSession) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const sessionData = JSON.parse(decodeURIComponent(userSession));
		
		// Check if user is admin
		if (sessionData.role !== 'ADMIN') {
			return json({ error: 'Forbidden - Admin access required' }, { status: 403 });
		}

		const prizes = await request.json();
		
		// Validate prize structure
		if (!prizes.daily || !prizes.weekly || !prizes.monthly) {
			return json({ error: 'Invalid prize structure' }, { status: 400 });
		}

		savePrizes(prizes);

		return json({ 
			success: true,
			message: 'Prizes updated successfully',
			prizes
		});
	} catch (error) {
		console.error('Error saving prizes:', error);
		return json({ error: 'Failed to save prizes' }, { status: 500 });
	}
};
