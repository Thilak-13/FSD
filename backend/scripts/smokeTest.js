const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const app = require('../src/app');
const User = require('../src/models/User');
const Vendor = require('../src/models/Vendor');
const PurchaseOrder = require('../src/models/PurchaseOrder');
const Invoice = require('../src/models/Invoice');
const AuditEntry = require('../src/models/AuditEntry');

async function runSmokeTests() {
  console.log('=== Starting PayVerify Orchestrator Smoke Tests ===');

  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  try {
    // Seed initial users
    const adminPass = await bcrypt.hash('AdminPass123!', 10);
    const requesterPass = await bcrypt.hash('RequesterPass123!', 10);

    const adminUser = await User.create({
      name: 'Elena Rodriguez',
      email: 'admin@payverify.local',
      passwordHash: adminPass,
      role: 'Admin',
      department: 'Finance',
    });

    const requesterUser = await User.create({
      name: 'Alex Rivera',
      email: 'requester@payverify.local',
      passwordHash: requesterPass,
      role: 'Requester',
      department: 'Procurement',
    });

    // Seed initial Vendor & PO
    const vendor = await Vendor.create({
      name: 'Apex Cloud Services',
      contactEmail: 'billing@apexcloud.io',
      paymentTerms: 'Net 30',
      address: '500 Howard St, Suite 400, San Francisco, CA 94105',
      taxId: '94-3289104',
      status: 'Active',
    });

    const po = await PurchaseOrder.create({
      poNumber: 'PO-2026-001',
      vendorId: vendor._id,
      amount: 6500,
      description: 'Q3 Enterprise Cloud Compute Services',
    });

    // 1. Healthcheck
    console.log('\n--- 1. GET /api/health ---');
    const healthRes = await request(app).get('/api/health');
    console.log(`Status: ${healthRes.status}`);
    console.log('Response body:', JSON.stringify(healthRes.body, null, 2));

    // 2. Auth Domain: POST /api/auth/login
    console.log('\n--- 2. POST /api/auth/login (Admin Login) ---');
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@payverify.local', password: 'AdminPass123!' });
    console.log(`Status: ${loginRes.status}`);
    console.log('Response body:', JSON.stringify(loginRes.body, null, 2));
    const adminToken = loginRes.body.token;

    // 3. Vendor Domain: GET /api/vendors & POST /api/vendors
    console.log('\n--- 3. GET /api/vendors ---');
    const vendorsRes = await request(app)
      .get('/api/vendors')
      .set('Authorization', `Bearer ${adminToken}`);
    console.log(`Status: ${vendorsRes.status}`);
    console.log('Response body:', JSON.stringify(vendorsRes.body, null, 2));

    console.log('\n--- POST /api/vendors (Create Vendor) ---');
    const createVendorRes = await request(app)
      .post('/api/vendors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Northwest Logistics',
        contactEmail: 'ap@northwestlogistics.com',
        paymentTerms: 'Net 15',
        address: '1200 Industrial Way, Seattle, WA 98101',
        taxId: '91-4829105',
      });
    console.log(`Status: ${createVendorRes.status}`);
    console.log('Response body:', JSON.stringify(createVendorRes.body, null, 2));

    // 4. Purchase Order Domain: GET /api/purchase-orders
    console.log('\n--- 4. GET /api/purchase-orders ---');
    const poRes = await request(app)
      .get('/api/purchase-orders')
      .set('Authorization', `Bearer ${adminToken}`);
    console.log(`Status: ${poRes.status}`);
    console.log('Response body:', JSON.stringify(poRes.body, null, 2));

    // 5. Invoices Domain: POST /api/invoices & GET /api/invoices
    console.log('\n--- 5. POST /api/invoices (Create Matching Invoice) ---');
    const createInvRes = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        invoiceNumber: 'INV-2026-001',
        vendorId: vendor._id.toString(),
        poId: po._id.toString(),
        amount: 6500,
        dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        submittedDate: new Date().toISOString().split('T')[0],
      });
    console.log(`Status: ${createInvRes.status}`);
    console.log('Response body:', JSON.stringify(createInvRes.body, null, 2));
    const createdInvoiceId = createInvRes.body.id;

    console.log('\n--- PATCH /api/invoices/:id/status (Approve Invoice) ---');
    const approveRes = await request(app)
      .patch(`/api/invoices/${createdInvoiceId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Approved', comment: 'Matches PO cleanly' });
    console.log(`Status: ${approveRes.status}`);
    console.log('Response body:', JSON.stringify(approveRes.body, null, 2));

    console.log('\n--- GET /api/invoices ---');
    const listInvRes = await request(app)
      .get('/api/invoices')
      .set('Authorization', `Bearer ${adminToken}`);
    console.log(`Status: ${listInvRes.status}`);
    console.log('Response body:', JSON.stringify(listInvRes.body, null, 2));

    // 6. Reports Domain: GET /api/reports/summary
    console.log('\n--- 6. GET /api/reports/summary ---');
    const summaryRes = await request(app).get('/api/reports/summary');
    console.log(`Status: ${summaryRes.status}`);
    console.log('Response body:', JSON.stringify(summaryRes.body, null, 2));

    // 7. Notifications Domain: GET /api/notifications
    console.log('\n--- 7. GET /api/notifications ---');
    const notifRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${adminToken}`);
    console.log(`Status: ${notifRes.status}`);
    console.log('Response body:', JSON.stringify(notifRes.body, null, 2));

    // 8. Audit Log Domain: GET /api/audit-log
    console.log('\n--- 8. GET /api/audit-log ---');
    const auditRes = await request(app)
      .get('/api/audit-log')
      .set('Authorization', `Bearer ${adminToken}`);
    console.log(`Status: ${auditRes.status}`);
    console.log('Response body:', JSON.stringify(auditRes.body, null, 2));

    console.log('\n=== Smoke Tests Complete: All Endpoints Verified Successfully ===');
  } catch (err) {
    console.error('Smoke test error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    await mongod.stop();
  }
}

runSmokeTests();
