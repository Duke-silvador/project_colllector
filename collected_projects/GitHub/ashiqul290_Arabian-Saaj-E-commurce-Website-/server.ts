import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { Database, initDatabase } from './server/db.ts';
import { authMiddleware, loginHandler, meHandler, signupHandler, AuthenticatedRequest } from './server/auth.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Ensure uploads directory exists and serve static uploads
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // Initialize DB (Mongo with graceful fallback to persistent local DB)
  await initDatabase();

  // ----------------- HEALTH CHECK -----------------
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Arabian Saaj API',
      timestamp: new Date().toISOString()
    });
  });

  // ----------------- AUTH APIS -----------------
  app.post('/api/auth/signup', signupHandler);
  app.post('/api/auth/login', loginHandler);
  app.post('/api/auth/logout', (req, res) => {
    res.json({ success: true, message: 'Logged out successfully' });
  });
  app.get('/api/auth/me', authMiddleware as any, meHandler as any);

  // ----------------- PRODUCT APIS -----------------
  // GET /api/products (public, with filters: search, sort, featured, sale)
  app.get('/api/products', async (req, res) => {
    try {
      const { search, sort, featured, sale } = req.query;
      const products = await Database.getProducts({
        search: search ? String(search) : undefined,
        sort: sort ? String(sort) : undefined,
        featured: featured === 'true',
        sale: sale === 'true'
      });
      res.json({ success: true, count: products.length, products });
    } catch (err: any) {
      console.error('Error fetching products:', err);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  });

  // GET /api/products/:id (public)
  app.get('/api/products/:id', async (req, res) => {
    try {
      const product = await Database.getProductById(req.params.id);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      res.json({ success: true, product });
    } catch (err: any) {
      console.error('Error fetching product:', err);
      res.status(500).json({ error: 'Failed to fetch product details' });
    }
  });

  // POST /api/products (admin only)
  app.post('/api/products', authMiddleware as any, async (req: AuthenticatedRequest, res) => {
    try {
      const { name, description, price, discountPrice, images, colors, sizes, stock, material, featured, sale } = req.body;

      if (!name || !price) {
        return res.status(400).json({ error: 'Product name and price are required' });
      }

      const newProduct = await Database.createProduct({
        name,
        description: description || '',
        price: Number(price),
        discountPrice: discountPrice ? Number(discountPrice) : undefined,
        images: Array.isArray(images) && images.length > 0 ? images : [],
        colors: Array.isArray(colors) ? colors : ['Classic Noir'],
        sizes: Array.isArray(sizes) ? sizes : ['Standard'],
        stock: stock !== undefined ? Number(stock) : 15,
        material: material || 'Premium Crepe & Silk',
        featured: Boolean(featured),
        sale: Boolean(sale),
        status: Number(stock) > 0 ? 'in_stock' : 'out_of_stock'
      });

      res.status(201).json({ success: true, product: newProduct });
    } catch (err: any) {
      console.error('Error creating product:', err);
      res.status(500).json({ error: 'Failed to create product' });
    }
  });

  // PUT /api/products/:id (admin only)
  app.put('/api/products/:id', authMiddleware as any, async (req: AuthenticatedRequest, res) => {
    try {
      const updated = await Database.updateProduct(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: 'Product not found for update' });
      }
      res.json({ success: true, product: updated });
    } catch (err: any) {
      console.error('Error updating product:', err);
      res.status(500).json({ error: 'Failed to update product' });
    }
  });

  // DELETE /api/products/:id (admin only)
  app.delete('/api/products/:id', authMiddleware as any, async (req: AuthenticatedRequest, res) => {
    try {
      const deleted = await Database.deleteProduct(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Product not found or already deleted' });
      }
      res.json({ success: true, message: 'Product deleted successfully' });
    } catch (err: any) {
      console.error('Error deleting product:', err);
      res.status(500).json({ error: 'Failed to delete product' });
    }
  });

  // ----------------- ORDER APIS -----------------
  // POST /api/orders (public checkout)
  app.post('/api/orders', async (req, res) => {
    try {
      const {
        customerName,
        phone,
        email,
        address,
        city,
        district,
        area,
        note,
        products,
        deliveryCharge,
        paymentMethod
      } = req.body;

      if (!customerName || !phone || !address || !city) {
        return res.status(400).json({ error: 'Customer name, phone, address, and city are required' });
      }

      if (!Array.isArray(products) || products.length === 0) {
        return res.status(400).json({ error: 'Order must contain at least one product' });
      }

      const order = await Database.createOrder({
        customerName,
        phone,
        email,
        address,
        city,
        district,
        area: area || city,
        note,
        products,
        deliveryCharge: Number(deliveryCharge) || 70,
        paymentMethod: paymentMethod || 'Cash on Delivery'
      });

      res.status(201).json({ success: true, order });
    } catch (err: any) {
      console.error('Error placing order:', err);
      res.status(500).json({ error: 'Failed to place order' });
    }
  });

  // GET /api/orders (admin only, filter by status or search)
  app.get('/api/orders', authMiddleware as any, async (req: AuthenticatedRequest, res) => {
    try {
      const { status, search } = req.query;
      const orders = await Database.getOrders({
        status: status ? String(status) : undefined,
        search: search ? String(search) : undefined
      });
      res.json({ success: true, count: orders.length, orders });
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  });

  // GET /api/orders/:id (public for confirmation or admin)
  app.get('/api/orders/:id', async (req, res) => {
    try {
      const order = await Database.getOrderById(req.params.id);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      res.json({ success: true, order });
    } catch (err: any) {
      console.error('Error fetching order:', err);
      res.status(500).json({ error: 'Failed to fetch order details' });
    }
  });

  // PUT /api/orders/:id (admin only: update order status)
  app.put('/api/orders/:id', authMiddleware as any, async (req: AuthenticatedRequest, res) => {
    try {
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }

      const validStatuses = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid order status' });
      }

      const updated = await Database.updateOrderStatus(req.params.id, status);
      if (!updated) {
        return res.status(404).json({ error: 'Order not found' });
      }

      res.json({ success: true, order: updated });
    } catch (err: any) {
      console.error('Error updating order:', err);
      res.status(500).json({ error: 'Failed to update order status' });
    }
  });

  // DELETE /api/orders/:id (admin only)
  app.delete('/api/orders/:id', authMiddleware as any, async (req: AuthenticatedRequest, res) => {
    try {
      const deleted = await Database.deleteOrder(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Order not found' });
      }
      res.json({ success: true, message: 'Order deleted successfully' });
    } catch (err: any) {
      console.error('Error deleting order:', err);
      res.status(500).json({ error: 'Failed to delete order' });
    }
  });

  // ----------------- ADMIN STATS -----------------
  app.get('/api/admin/stats', authMiddleware as any, async (req: AuthenticatedRequest, res) => {
    try {
      const stats = await Database.getStats();
      res.json({ success: true, stats });
    } catch (err: any) {
      console.error('Error fetching admin stats:', err);
      res.status(500).json({ error: 'Failed to calculate stats' });
    }
  });

  // ----------------- IMAGE UPLOAD / PREVIEW API -----------------
  app.post('/api/upload', authMiddleware as any, async (req: AuthenticatedRequest, res) => {
    try {
      const { imageBase64, filename } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: 'No image data provided' });
      }

      // Handle base64 saving to uploads folder
      const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let buffer: Buffer;
      let extension = 'jpg';

      if (matches && matches.length === 3) {
        const mime = matches[1];
        if (mime.includes('png')) extension = 'png';
        else if (mime.includes('webp')) extension = 'webp';
        buffer = Buffer.from(matches[2], 'base64');
      } else {
        buffer = Buffer.from(imageBase64, 'base64');
      }

      const cleanName = filename ? filename.replace(/[^a-zA-Z0-9_-]/g, '') : 'product';
      const newFilename = `${cleanName}-${Date.now()}.${extension}`;
      const filePath = path.join(uploadsDir, newFilename);

      fs.writeFileSync(filePath, buffer);
      const fileUrl = `/uploads/${newFilename}`;

      res.json({
        success: true,
        url: fileUrl,
        message: 'Image uploaded successfully'
      });
    } catch (err: any) {
      console.error('Upload error:', err);
      res.status(500).json({ error: 'Failed to upload image' });
    }
  });

  // ----------------- CONTACT FORM API -----------------
  app.post('/api/contact', async (req, res) => {
    try {
      const { name, phone, email, message } = req.body;
      if (!name || !message) {
        return res.status(400).json({ error: 'Name and message are required' });
      }
      console.log('Customer inquiry received:', { name, phone, email, message });
      res.json({
        success: true,
        message: 'Thank you for contacting Arabian Saaj. Our concierge will get back to you promptly.'
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to process contact inquiry' });
    }
  });

  // ----------------- VITE MIDDLEWARE / STATIC FILES -----------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✨ Arabian Saaj server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Arabian Saaj server:', err);
});
