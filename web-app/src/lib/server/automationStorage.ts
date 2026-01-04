import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_FILE = path.join(process.cwd(), 'data', 'automations.json');

export interface Automation {
	id: string;
	name: string;
	description?: string;
	userId?: string;  // null = global (admin-wide), userId = user-specific
	triggerType: string;
	triggerValue?: number;
	triggerData?: any;
	actionTypes: string[];  // Support multiple channels
	actionData?: any;
	messageSubject?: string;
	messageBody: string;
	status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
	priority: number;
	isUserEnabled: boolean;  // User can enable/disable their automations
	totalTriggered: number;
	totalSent: number;
	totalFailed: number;
	lastTriggered?: string;
	createdAt: string;
	updatedAt: string;
	createdBy?: string;  // Admin who created it
}

// Ensure data directory exists
function ensureDataDir() {
	const dataDir = path.join(process.cwd(), 'data');
	if (!fs.existsSync(dataDir)) {
		fs.mkdirSync(dataDir, { recursive: true });
	}
}

// Load automations from file
export function loadAutomations(): Automation[] {
	ensureDataDir();
	
	if (!fs.existsSync(STORAGE_FILE)) {
		return [];
	}
	
	try {
		const data = fs.readFileSync(STORAGE_FILE, 'utf-8');
		return JSON.parse(data);
	} catch (error) {
		console.error('Error loading automations:', error);
		return [];
	}
}

// Save automations to file
function saveAutomations(automations: Automation[]) {
	ensureDataDir();
	
	try {
		fs.writeFileSync(STORAGE_FILE, JSON.stringify(automations, null, 2), 'utf-8');
	} catch (error) {
		console.error('Error saving automations:', error);
		throw new Error('Failed to save automations');
	}
}

// Get all automations (admin only)
export function getAllAutomations(): Automation[] {
	return loadAutomations();
}

// Get automations for specific user (includes global + user-specific)
export function getUserAutomations(userId: string): Automation[] {
	const automations = loadAutomations();
	return automations.filter(a => 
		!a.userId || // Global automations (available to all)
		a.userId === userId // User-specific automations
	);
}

// Get only global automations (admin-created, available to all users)
export function getGlobalAutomations(): Automation[] {
	const automations = loadAutomations();
	return automations.filter(a => !a.userId);
}

// Get only user-specific automations
export function getUserSpecificAutomations(userId: string): Automation[] {
	const automations = loadAutomations();
	return automations.filter(a => a.userId === userId);
}

// Get automation by ID
export function getAutomationById(id: string): Automation | null {
	const automations = loadAutomations();
	return automations.find(a => a.id === id) || null;
}

// Check if user can access automation
export function canUserAccessAutomation(automationId: string, userId: string, isAdmin: boolean): boolean {
	const automation = getAutomationById(automationId);
	if (!automation) return false;
	
	// Admins can access everything
	if (isAdmin) return true;
	
	// Users can access global automations and their own
	return !automation.userId || automation.userId === userId;
}

// Check if user can modify automation
export function canUserModifyAutomation(automationId: string, userId: string, isAdmin: boolean): boolean {
	const automation = getAutomationById(automationId);
	if (!automation) return false;
	
	// Admins can modify everything
	if (isAdmin) return true;
	
	// Users can only modify their own automations
	return automation.userId === userId;
}

// Create new automation
export function createAutomation(data: Omit<Automation, 'id' | 'totalTriggered' | 'totalSent' | 'totalFailed' | 'createdAt' | 'updatedAt'>): Automation {
	const automations = loadAutomations();
	
	const newAutomation: Automation = {
		...data,
		id: uuidv4(),
		isUserEnabled: data.isUserEnabled ?? true,
		totalTriggered: 0,
		totalSent: 0,
		totalFailed: 0,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString()
	};
	
	automations.push(newAutomation);
	saveAutomations(automations);
	
	return newAutomation;
}

// Toggle user automation enabled state
export function toggleUserAutomation(automationId: string, userId: string, isEnabled: boolean): Automation | null {
	const automations = loadAutomations();
	const index = automations.findIndex(a => a.id === automationId);
	
	if (index === -1) return null;
	
	// Verify user can access this automation
	if (automations[index].userId && automations[index].userId !== userId) {
		return null; // Not authorized
	}
	
	automations[index].isUserEnabled = isEnabled;
	automations[index].updatedAt = new Date().toISOString();
	
	saveAutomations(automations);
	return automations[index];
}

// Update automation
export function updateAutomation(id: string, updates: Partial<Automation>): Automation | null {
	const automations = loadAutomations();
	const index = automations.findIndex(a => a.id === id);
	
	if (index === -1) {
		return null;
	}
	
	automations[index] = {
		...automations[index],
		...updates,
		id: automations[index].id, // Ensure ID doesn't change
		updatedAt: new Date().toISOString()
	};
	
	saveAutomations(automations);
	return automations[index];
}

// Delete automation
export function deleteAutomation(id: string): boolean {
	const automations = loadAutomations();
	const filteredAutomations = automations.filter(a => a.id !== id);
	
	if (filteredAutomations.length === automations.length) {
		return false; // Not found
	}
	
	saveAutomations(filteredAutomations);
	return true;
}

// Get statistics
export function getAutomationStats() {
	const automations = loadAutomations();
	
	return {
		total: automations.length,
		active: automations.filter(a => a.status === 'ACTIVE').length,
		paused: automations.filter(a => a.status === 'PAUSED').length,
		archived: automations.filter(a => a.status === 'ARCHIVED').length,
		totalTriggered: automations.reduce((sum, a) => sum + a.totalTriggered, 0),
		totalSent: automations.reduce((sum, a) => sum + a.totalSent, 0),
		totalFailed: automations.reduce((sum, a) => sum + a.totalFailed, 0)
	};
}
