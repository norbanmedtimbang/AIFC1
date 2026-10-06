import { UserRole } from '../types';
import { NavModule } from '../components/layout/Sidebar';

export interface RolePermissions {
  displayName: string;
  description: string;
  badgeColor: string;
  allowedModules: NavModule[];
  canManageUsers: boolean;
  canManageSecuritySettings: boolean;
  canManageMenu: boolean;
  canManageInventory: boolean;
  canManagePurchases: boolean;
  canManageExpenses: boolean;
  canViewReports: boolean;
  canRefundWithoutManagerPin: boolean;
  canDeleteStaff: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    displayName: 'Administrator',
    description: 'Full operational, managerial, and system security privileges',
    badgeColor: 'bg-[#3B2925] text-white',
    allowedModules: [
      'dashboard',
      'pos',
      'menu',
      'inventory',
      'purchases',
      'orders',
      'expenses',
      'reports',
      'staff',
      'settings'
    ],
    canManageUsers: true,
    canManageSecuritySettings: true,
    canManageMenu: true,
    canManageInventory: true,
    canManagePurchases: true,
    canManageExpenses: true,
    canViewReports: true,
    canRefundWithoutManagerPin: true,
    canDeleteStaff: true
  },
  manager: {
    displayName: 'Store Manager',
    description: 'Operational and managerial access, reporting and shift administration',
    badgeColor: 'bg-[#523B36] text-[#F7F3EB]',
    allowedModules: [
      'dashboard',
      'pos',
      'menu',
      'inventory',
      'purchases',
      'orders',
      'expenses',
      'reports',
      'staff'
    ],
    canManageUsers: false,
    canManageSecuritySettings: false,
    canManageMenu: true,
    canManageInventory: true,
    canManagePurchases: true,
    canManageExpenses: true,
    canViewReports: true,
    canRefundWithoutManagerPin: true,
    canDeleteStaff: false
  },
  cashier: {
    displayName: 'Cashier',
    description: 'POS register operations, order taking, and cash drawer floats',
    badgeColor: 'bg-[#A8B5A0] text-[#1F291C]',
    allowedModules: [
      'pos',
      'dashboard',
      'orders',
      'staff'
    ],
    canManageUsers: false,
    canManageSecuritySettings: false,
    canManageMenu: false,
    canManageInventory: false,
    canManagePurchases: false,
    canManageExpenses: false,
    canViewReports: false,
    canRefundWithoutManagerPin: false,
    canDeleteStaff: false
  }
};

/**
 * Checks whether a user role is authorized to view a specific module.
 */
export function hasModuleAccess(role: UserRole | undefined, module: NavModule): boolean {
  if (!role) return false;
  const config = ROLE_PERMISSIONS[role];
  if (!config) return false;
  return config.allowedModules.includes(module);
}

/**
 * Returns the list of modules accessible by a given role.
 */
export function getAccessibleModules(role: UserRole | undefined): NavModule[] {
  if (!role) return [];
  const config = ROLE_PERMISSIONS[role];
  return config ? config.allowedModules : [];
}

/**
 * Resolves the primary default landing module for a given role upon login.
 */
export function getDefaultModuleForRole(role: UserRole | undefined): NavModule {
  if (role === 'cashier') return 'pos';
  return 'dashboard';
}

/**
 * Checks a specific functional capability for a user role.
 */
export function canPerformCapability(
  role: UserRole | undefined,
  capability: keyof Omit<RolePermissions, 'displayName' | 'description' | 'badgeColor' | 'allowedModules'>
): boolean {
  if (!role) return false;
  const config = ROLE_PERMISSIONS[role];
  return config ? !!config[capability] : false;
}

/**
 * User-friendly display names for navigation modules.
 */
export const MODULE_NAMES: Record<NavModule, string> = {
  dashboard: 'Operations Dashboard',
  pos: 'Cashier Register (POS)',
  menu: 'Menu & Recipes Management',
  inventory: 'Inventory & Materials Ledger',
  purchases: 'Purchases & Vendor Deliveries',
  orders: 'Transactions & Order Journal',
  expenses: 'Store Petty Cash & Expenses',
  reports: 'POS Financial Readings (X/Z)',
  staff: 'Staff Accounts & Shift Controls',
  settings: 'Terminal Configuration & Backups'
};
