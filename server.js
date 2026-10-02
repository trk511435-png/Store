const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// تقديم ملفات الواجهة الأمامية إذا وضعتها في مجلد public، أو تفعيل الملفات الثابتة
app.use(express.static(path.join(__dirname)));

// تخزين مؤقت للطلبات في الذاكرة السحابية للسيرفر
let orders = [];
let totalSales = 0;

io.on('connection', (socket) => {
  console.log('🔗 متصل جديد بالنظام:', socket.id);

  // إرسال الطلبات الحالية للآدمن أو العميل فور الاتصال
  socket.emit('init_data', { orders, totalSales });

  // استقبال طلب جديد من العميل
  socket.on('new_order', (orderData) => {
    orders.unshift(orderData);
    // بث الطلب الجديد لحظياً لجميع الأجهزة المتصلة (مثل لوحة الآدمن)
    io.emit('update_orders', { orders, totalSales });
  });

  // استقبال موافقة الآدمن على الطلب
  socket.on('approve_order', ({ orderId, code }) => {
    if (code === '5') {
      const order = orders.find(o => o.id === orderId);
      if (order && order.status === 'pending') {
        order.status = 'approved';
        totalSales += order.total;
        // تحديث الحالة لجميع الأجهزة المتصلة فوراً
        io.emit('update_orders', { orders, totalSales });
        socket.emit('approval_result', { success: true, message: 'تم اعتماد الطلب بنجاح' });
      }
    } else {
      socket.emit('approval_result', { success: false, message: 'الكود غير صحيح!' });
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ انقطع الاتصال:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 السيرفر يعمل بنجاح على البورت ${PORT}`);
});
