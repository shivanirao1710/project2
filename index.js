const express = require('express');
const bodyParser = require('body-parser');
const cron = require('node-cron');

const app = express();
app.use(bodyParser.json());

// In-memory storage for menu items and orders
let menuItems = [];
let orders = [];
let nextOrderId = 1;

// Predefined categories for menu items
const validCategories = ["Main Course", "Appetizer", "Dessert", "Beverage"];

// Add Menu Item Endpoint
app.post('/menu', (req, res) => {
  const { name, price, category } = req.body;

  if (!name || typeof price !== 'number' || price <= 0 || !validCategories.includes(category)) {
    return res.status(400).json({ error: "Invalid menu item details" });
  }

  // Check if the item already exists
  const existingItem = menuItems.find(item => item.name === name);
  if (existingItem) {
    return res.status(400).json({ error: "Menu item already exists" });
  }

  // Create the menu item
  const menuItem = {
    id: menuItems.length + 1,
    name,
    price,
    category
  };
  menuItems.push(menuItem);
  res.status(201).json(menuItem);
});

// Get Menu Endpoint
app.get('/menu', (req, res) => {
  res.status(200).json(menuItems);
});

// Place Order Endpoint
app.post('/orders', (req, res) => {
  const { items, customer } = req.body;

  // Validate customer info
  if (!customer || !customer.name || !customer.address) {
    return res.status(400).json({ error: "Customer information is required" });
  }

  // Validate order items
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Order items are required" });
  }

  const invalidItems = items.filter(item => !menuItems.find(menuItem => menuItem.id === item.id));
  if (invalidItems.length > 0) {
    return res.status(400).json({ error: "One or more items do not exist in the menu" });
  }

  // Create the order
  const order = {
    id: nextOrderId++,
    items,
    customer,
    status: 'Preparing',
    timestamp: new Date(),
  };
  orders.push(order);
  res.status(201).json({ message: "Order placed successfully", orderId: order.id });
});

// Get Order by ID Endpoint
app.get('/orders/:id', (req, res) => {
  const orderId = parseInt(req.params.id, 10);
  const order = orders.find(o => o.id === orderId);
  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }
  res.status(200).json(order);
});

// CRON job to update order statuses periodically
cron.schedule('*/10 * * * * *', () => { // Runs every 10 seconds
  orders.forEach(order => {
    if (order.status === 'Preparing') {
      order.status = 'Out for Delivery';
    } else if (order.status === 'Out for Delivery') {
      order.status = 'Delivered';
    }
  });

});

// Start the server
const PORT = 8081;
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
