const express = require('express');
const path = require('path'); 

const app = express();
const port = 3000;

// Cấu hình để server tự động đọc file index.html trong thư mục public
app.use(express.static(path.join(__dirname, 'public')));

app.listen(port, () => {
    console.log(`🚀 Server đang chạy tại địa chỉ: http://localhost:${port}`);
});