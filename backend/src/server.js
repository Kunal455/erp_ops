const app = require('./app');
const { config, prisma } = require('./config');
const bcrypt = require('bcryptjs');

const PORT = config.port || 5000;

async function bootstrapDatabase() {
  try {
    const adminCheck = await prisma.user.findUnique({
      where: { email: 'kk6547015@gmail.com' },
    });

    if (!adminCheck) {
      console.log('⚡ Ensuring default Admin and Seed Data are provisioned...');
      const passwordHashKunal = await bcrypt.hash('12345678', 10);
      const passwordHashAdmin = await bcrypt.hash('admin123', 10);
      const passwordHashOps = await bcrypt.hash('operations123', 10);
      const passwordHashSales = await bcrypt.hash('sales123', 10);

      // Create default location if not exists
      let defaultLoc = await prisma.location.findFirst();
      if (!defaultLoc) {
        defaultLoc = await prisma.location.create({
          data: {
            code: 'WH-NORTH',
            name: 'Warehouse North (Main Depot)',
            address: '100 Industrial Parkway',
          },
        });
      }

      await prisma.user.upsert({
        where: { email: 'kk6547015@gmail.com' },
        update: { passwordHash: passwordHashKunal, role: 'ADMIN' },
        create: {
          email: 'kk6547015@gmail.com',
          name: 'Kunal Admin',
          passwordHash: passwordHashKunal,
          role: 'ADMIN',
          locationId: defaultLoc.id,
        },
      });

      await prisma.user.upsert({
        where: { email: 'admin@erp.com' },
        update: { passwordHash: passwordHashAdmin, role: 'ADMIN' },
        create: {
          email: 'admin@erp.com',
          name: 'System Admin',
          passwordHash: passwordHashAdmin,
          role: 'ADMIN',
          locationId: defaultLoc.id,
        },
      });

      await prisma.user.upsert({
        where: { email: 'operations@erp.com' },
        update: { passwordHash: passwordHashOps, role: 'OPERATIONS_USER' },
        create: {
          email: 'operations@erp.com',
          name: 'Operations Manager',
          passwordHash: passwordHashOps,
          role: 'OPERATIONS_USER',
          locationId: defaultLoc.id,
        },
      });

      await prisma.user.upsert({
        where: { email: 'sales@erp.com' },
        update: { passwordHash: passwordHashSales, role: 'SALES_USER' },
        create: {
          email: 'sales@erp.com',
          name: 'Sales Representative',
          passwordHash: passwordHashSales,
          role: 'SALES_USER',
          locationId: defaultLoc.id,
        },
      });

      console.log('✅ Admin (kk6547015@gmail.com / 12345678) ready.');
    }
  } catch (err) {
    console.warn('⚠️ Auto-bootstrap notice:', err.message);
  }
}

const server = app.listen(PORT, async () => {
  console.log(`🚀 Mini Operations ERP Backend API running at: http://localhost:${PORT}`);
  console.log(`📑 Swagger Documentation available at: http://localhost:${PORT}/api/docs`);
  console.log(`🏥 Health Check available at: http://localhost:${PORT}/health`);
  await bootstrapDatabase();
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
