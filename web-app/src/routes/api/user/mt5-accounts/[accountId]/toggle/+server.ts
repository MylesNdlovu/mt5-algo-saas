import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PrismaClient } from '@prisma/client';
import { getSessionUser } from '$lib/server/auth';

const prisma = new PrismaClient();

// PATCH: Toggle isEnabledForTrading for a specific MT5 account
export const PATCH: RequestHandler = async ({ params, cookies }) => {
	const sessionUser = getSessionUser(cookies);

	if (!sessionUser) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { accountId } = params;

	try {
		// Verify the account belongs to the user
		const account = await prisma.mT5Account.findFirst({
			where: {
				id: accountId,
				userId: sessionUser.userId
			}
		});

		if (!account) {
			return json({ error: 'MT5 account not found' }, { status: 404 });
		}

		// Check if user has reached the 5-account limit when enabling
		if (!account.isEnabledForTrading) {
			const enabledAccounts = await prisma.mT5Account.count({
				where: {
					userId: sessionUser.userId,
					isEnabledForTrading: true
				}
			});

			if (enabledAccounts >= 5) {
				return json(
					{ error: 'Maximum of 5 accounts can be enabled for trading' },
					{ status: 400 }
				);
			}
		}

		// Toggle the isEnabledForTrading status
		const updatedAccount = await prisma.mT5Account.update({
			where: { id: accountId },
			data: {
				isEnabledForTrading: !account.isEnabledForTrading
			},
			select: {
				id: true,
				accountNumber: true,
				isEnabledForTrading: true
			}
		});

		console.log('[MT5Accounts API] Toggled account:', {
			accountId,
			accountNumber: updatedAccount.accountNumber,
			isEnabled: updatedAccount.isEnabledForTrading,
			userId: sessionUser.userId
		});

		return json({
			success: true,
			account: updatedAccount,
			message: updatedAccount.isEnabledForTrading
				? 'Account enabled for trading'
				: 'Account disabled for trading'
		});
	} catch (error) {
		console.error('[MT5Accounts API] Error toggling account:', error);
		return json({ error: 'Failed to toggle account status' }, { status: 500 });
	}
};
