import { setupTestDB } from './setup';
import { seedDatabase } from '../db/seed';
import { User } from '../models/User';
import { Vendor } from '../models/Vendor';
import { PurchaseOrder } from '../models/PurchaseOrder';
import { Invoice } from '../models/Invoice';
import { AuditEntry } from '../models/AuditEntry';

describe('Database Seed Script Test', () => {
  setupTestDB();

  it('successfully seeds initial users, vendors, POs, invoices, and audit entries', async () => {
    await seedDatabase();

    const [users, vendors, pos, invoices, audits] = await Promise.all([
      User.find(),
      Vendor.find(),
      PurchaseOrder.find(),
      Invoice.find(),
      AuditEntry.find(),
    ]);

    expect(users.length).toBeGreaterThanOrEqual(5);
    expect(vendors.length).toBe(5);
    expect(pos.length).toBe(8);
    expect(invoices.length).toBe(18);
    expect(audits.length).toBe(11);

    // Verify user password hash
    const admin = await User.findOne({ email: 'sarah.chen@enterprise.com' });
    expect(admin).toBeDefined();
    expect(admin?.role).toBe('Admin');
    expect(admin?.passwordHash).toBeDefined();
  });
});
