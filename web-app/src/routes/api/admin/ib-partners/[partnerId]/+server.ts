import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PrismaClient } from '@prisma/client';
import { getSessionUser, isAdmin } from '$lib/server/auth';
import type { AdminIBPartnerView, AdminAccountView } from '$lib/types/ib-types';

const prisma = new PrismaClient();

/**
 * GET /api/admin/ib-partners/[partnerId]
 * Get detailed IB partner information (Admin only)
 * Shows FULL account details including real MT5 numbers and trader info
 */
export const GET: RequestHandler = async ({ cookies, params }) => {
	const sessionUser = getSessionUser(cookies);

	if (!sessionUser || !isAdmin(sessionUser)) {
		return json({ success: false, error: 'Admin access required' }, { status: 403 });
	}

	try {
		const { partnerId } = params;

		// Get IB partner with basic info
		const ibPartner = await prisma.iBPartner.findUnique({
			where: {
				id: partnerId
			}
		});

		if (!ibPartner) {
			return json({ success: false, error: 'IB partner not found' }, { status: 404 });
		}

		// Get anonymous accounts linked to this IB with user details
		const anonymousAccounts = await prisma.anonymousAccount.findMany({
			where: {
				ibPartnerId: partnerId
			},
			include: {
				user: {
					select: {
						id: true,
						email: true,
						firstName: true,
						lastName: true,
						createdAt: true
					}
				}
			}
		});

		// Transform to admin view with full details
		const accountViews: AdminAccountView[] = await Promise.all(
			anonymousAccounts.map(async (anon) => {
				// Get the MT5 account balance/equity
				const mt5Account = await prisma.mT5Account.findUnique({
					where: { accountNumber: anon.mt5AccountNumber },
					select: { balance: true, equity: true }
				});

				return {
					anonymousId: anon.anonymousId,
					mt5AccountNumber: anon.mt5AccountNumber,
					userId: anon.userId,
					userName: `${anon.user.firstName} ${anon.user.lastName}`,
					userEmail: anon.user.email,
					ibPartnerName: ibPartner.contactName,
					ibPartnerEmail: ibPartner.email,
					registeredAt: anon.registeredAt,
					isActive: anon.isActive,
					totalVolume: 0, // Will be calculated from commissions
					totalTrades: 0,
					averageSpread: 0,
					balance: mt5Account?.balance || 0,
					equity: mt5Account?.equity || 0
				};
			})
		);

		// Get commission data for this IB
		const commissions = await prisma.iBCommission.findMany({
			where: {
				ibPartnerId: partnerId
			},
			orderBy: {
				period: 'desc'
			}
		});

		// Calculate statistics
		const totalEarned = commissions.reduce((sum, c) => sum + c.netCommission, 0);
		const pendingPayment = commissions
			.filter((c) => !c.isPaid)
			.reduce((sum, c) => sum + c.netCommission, 0);

		const lastPayment = commissions.find((c) => c.isPaid && c.paidAt);

		// Get current month commissions
		const now = new Date();
		const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
		const currentMonthCommissions = commissions.filter(
			(c) => c.period >= currentMonthStart
		);

		const monthlyRevenue = currentMonthCommissions.reduce(
			(sum, c) => sum + c.netCommission,
			0
		);

		// Get all-time stats
		const lifetimeRevenue = totalEarned;
		const totalTraders = anonymousAccounts.length;
		const activeTraders = anonymousAccounts.filter((a) => a.isActive).length;

		// Get commission rate configs (if they exist)
		const commissionRates = await prisma.commissionRateConfig.findMany({
			where: {
				ibPartnerId: partnerId,
				isActive: true
			},
			orderBy: {
				minVolume: 'asc'
			}
		});

		const partnerView: AdminIBPartnerView = {
			id: ibPartner.id,
			email: ibPartner.email,
			companyName: ibPartner.companyName,
			contactName: ibPartner.contactName,
			phone: ibPartner.phone,
			ibCode: ibPartner.ibCode,
			isActive: ibPartner.isActive,
			isApproved: ibPartner.isApproved,
			// White Label Settings
			logo: ibPartner.logo,
			favicon: ibPartner.favicon,
			brandColor: ibPartner.brandColor,
			brandName: ibPartner.brandName,
			domain: ibPartner.domain,
			// Statistics
			totalTraders,
			activeTraders,
			monthlyRevenue,
			lifetimeRevenue,
			spreadRevShare: 0.5, // Default 0.5% - should come from config
			commissionRates: commissionRates.map((rate) => ({
				id: rate.id,
				commissionRate: rate.commissionRate,
				minVolume: rate.minVolume,
				maxVolume: rate.maxVolume,
				effectiveFrom: rate.effectiveFrom,
				effectiveTo: rate.effectiveTo,
				isActive: rate.isActive
			})),
			createdAt: ibPartner.createdAt,
			approvedAt: ibPartner.approvedAt ? new Date(ibPartner.approvedAt) : undefined
		};

		return json({
			success: true,
			partner: partnerView,
			accounts: accountViews,
			commissionHistory: commissions.map((c) => ({
				id: c.id,
				period: c.period,
				periodEnd: c.periodEnd,
				tradingVolume: c.tradingVolume,
				numberOfTrades: c.numberOfTrades,
				averageSpread: c.averageSpread,
				grossCommission: c.grossCommission,
				platformFee: c.platformFee,
				netCommission: c.netCommission,
				commissionRate: c.commissionRate,
				isPaid: c.isPaid,
				paidAt: c.paidAt,
				paymentReference: c.paymentReference
			})),
			summary: {
				totalEarned,
				pendingPayment,
				lastPaymentDate: lastPayment?.paidAt,
				lastPaymentAmount: lastPayment?.netCommission
			}
		});
	} catch (error) {
		console.error('[Admin IB Detail] Error:', error);
		return json(
			{
				success: false,
				error: 'Failed to fetch IB partner details'
			},
			{ status: 500 }
		);
	}
};

/**
 * PATCH /api/admin/ib-partners/[partnerId]
 * Update IB partner settings (Admin only)
 */
export const PATCH: RequestHandler = async ({ request, cookies, params }) => {
	const sessionUser = getSessionUser(cookies);

	if (!sessionUser || !isAdmin(sessionUser)) {
		return json({ success: false, error: 'Admin access required' }, { status: 403 });
	}

	try {
		const { partnerId } = params;
		const body = await request.json();
		const { isActive, isApproved, spreadRevShare, commissionRate } = body;

		// Update IB partner
		const updatedPartner = await prisma.iBPartner.update({
			where: {
				id: partnerId
			},
			data: {
				...(typeof isActive === 'boolean' && { isActive }),
				...(typeof isApproved === 'boolean' && {
					isApproved,
					approvedAt: isApproved ? new Date() : null,
					approvedBy: isApproved ? sessionUser.userId : null
				})
			}
		});

		return json({
			success: true,
			message: 'IB partner updated successfully',
			partner: {
				id: updatedPartner.id,
				isActive: updatedPartner.isActive,
				isApproved: updatedPartner.isApproved,
				approvedAt: updatedPartner.approvedAt
			}
		});
	} catch (error) {
		console.error('[Admin IB Update] Error:', error);
		return json(
			{
				success: false,
				error: 'Failed to update IB partner'
			},
			{ status: 500 }
		);
	}
};

/**
 * DELETE /api/admin/ib-partners/[partnerId]
 * Delete IB partner (Admin only)
 */
export const DELETE: RequestHandler = async ({ cookies, params }) => {
	const sessionUser = getSessionUser(cookies);

	if (!sessionUser || !isAdmin(sessionUser)) {
		return json({ success: false, error: 'Admin access required' }, { status: 403 });
	}

	try {
		const { partnerId } = params;

		// Check if IB has any referred traders
		const anonymousAccountsCount = await prisma.anonymousAccount.count({
			where: {
				ibPartnerId: partnerId
			}
		});

		if (anonymousAccountsCount > 0) {
			return json(
				{
					error: 'Cannot delete IB partner with active referrals. Deactivate instead.'
				},
				{ status: 400 }
			);
		}

		// Delete IB partner
		await prisma.iBPartner.delete({
			where: {
				id: partnerId
			}
		});

		return json({
			success: true,
			message: 'IB partner deleted successfully'
		});
	} catch (error) {
		console.error('[Admin IB Delete] Error:', error);
		return json(
			{
				success: false,
				error: 'Failed to delete IB partner'
			},
			{ status: 500 }
		);
	}
};
