import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { randomBytes } from 'crypto';

// In production, this should query the database
// For now, we'll generate a mock API key

export const GET: RequestHandler = async ({ locals }) => {
	const session = locals.session;
	
	if (!session?.user) {
		throw error(401, 'Unauthorized');
	}

	// TODO: Query database for user's actual API key
	// For now, generate a deterministic key based on user ID
	const apiKey = generateApiKey(session.user.id);

	return json({ apiKey });
};

export const POST: RequestHandler = async ({ locals }) => {
	const session = locals.session;
	
	if (!session?.user) {
		throw error(401, 'Unauthorized');
	}

	// TODO: Generate new API key and save to database
	// This should invalidate the old key
	const newApiKey = randomBytes(32).toString('hex');

	// TODO: Update database with new API key
	// await prisma.user.update({
	//   where: { id: session.user.id },
	//   data: { agentApiKey: newApiKey }
	// });

	return json({ apiKey: newApiKey });
};

function generateApiKey(userId: string): string {
	// Generate a deterministic API key for demo purposes
	// In production, this should be stored in database
	const hash = Buffer.from(`${userId}-scalperium-agent-key`).toString('base64');
	return `sk_${hash.substring(0, 48)}`;
}
