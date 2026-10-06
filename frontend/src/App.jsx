import { useState, useEffect } from 'react';

function App() {
  const [products, setProducts] = useState([]);
  
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  
  // Biến mới: Theo dõi xem ta đang ở chế độ "Thêm" hay "Sửa" (Lưu ID của hàng đang sửa)
  const [editingId, setEditingId] = useState(null);

  const fetchProducts = () => {
    fetch('http://localhost:3000/products')
      .then(res => res.json())
      .then(data => setProducts(data))
      .catch(err => console.error("Lỗi kết nối:", err));
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // HÀM GỘP: Xử lý cả việc Thêm mới và Lưu thay đổi
  const handleSubmit = () => {
    if (!name || !price || !stock) return; 

    const payload = {
      product_name: name,
      price: Number(price),
      stock_quantity: Number(stock)
    };

    if (editingId) {
      // NẾU ĐANG SỬA: Gửi lệnh PUT xuống Backend
      fetch(`http://localhost:3000/products/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(() => {
        fetchProducts(); // Tải lại bảng
        resetForm();     // Xóa trắng form, thoát chế độ sửa
      })
      .catch(err => console.error("Lỗi cập nhật:", err));
    } else {
      // NẾU THÊM MỚI: Gửi lệnh POST như cũ
      fetch('http://localhost:3000/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(() => {
        fetchProducts(); 
        resetForm();
      })
      .catch(err => console.error("Lỗi thêm mới:", err));
    }
  };

  // Hàm phụ: Kéo dữ liệu từ bảng ném lên form
  const handleEditClick = (item) => {
    setEditingId(item.id); // Bật chế độ sửa cho ID này
    setName(item.product_name);
    setPrice(item.price);
    setStock(item.stock_quantity);
  };

  // Hàm phụ: Hủy sửa, quay về chế độ thêm mới
  const resetForm = () => {
    setEditingId(null);
    setName('');
    setPrice('');
    setStock('');
  };

  const handleDeleteProduct = (id) => {
    setProducts(products.filter(item => item.id !== id));
    fetch(`http://localhost:3000/products/${id}`, { method: 'DELETE' })
      .catch(() => fetchProducts());
  };

  return (
    <div style={{ padding: '30px', fontFamily: 'sans-serif' }}>
      <h2>📦 Bảng Điều Khiển Kho Hàng</h2>
      
      {/* Form Nhập Liệu Tích Hợp Thêm & Sửa */}
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: editingId ? '#fff3cd' : '#e9ecef', borderRadius: '5px' }}>
        <h4 style={{ marginTop: 0 }}>
          {editingId ? '✏️ Cập Nhật Hàng Hóa' : '➕ Thêm Hàng Mới'}
        </h4>
        <input 
          type="text" 
          placeholder="Tên sản phẩm..." 
          value={name} 
          onChange={(e) => setName(e.target.value)}
          style={{ marginRight: '10px', padding: '8px', width: '200px' }}
        />
        <input 
          type="number" 
          placeholder="Giá bán (VNĐ)..." 
          value={price} 
          onChange={(e) => setPrice(e.target.value)}
          style={{ marginRight: '10px', padding: '8px', width: '150px' }}
        />
        <input 
          type="number" 
          placeholder="Số lượng..." 
          value={stock} 
          onChange={(e) => setStock(e.target.value)}
          style={{ marginRight: '10px', padding: '8px', width: '100px' }}
        />
        
        {/* Đổi màu và tên nút tùy theo trạng thái */}
        <button 
          onClick={handleSubmit} 
          style={{ padding: '8px 15px', cursor: 'pointer', backgroundColor: editingId ? '#ffc107' : '#4CAF50', color: editingId ? 'black' : 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}
        >
          {editingId ? 'Lưu thay đổi' : 'Thêm vào kho'}
        </button>

        {/* Hiện nút Hủy nếu đang ở chế độ sửa */}
        {editingId && (
          <button 
            onClick={resetForm} 
            style={{ padding: '8px 15px', cursor: 'pointer', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', marginLeft: '10px' }}
          >
            Hủy
          </button>
        )}
      </div>

      {/* Bảng hiển thị */}
      <table border="1" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginTop: '20px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f2f2f2' }}>
            <th style={{ padding: '12px' }}>Tên sản phẩm</th>
            <th style={{ padding: '12px' }}>Giá bán</th>
            <th style={{ padding: '12px' }}>Tồn kho</th>
            <th style={{ padding: '12px', textAlign: 'center' }}>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {products.map(item => (
            <tr key={item.id}>
              <td style={{ padding: '12px' }}>{item.product_name}</td>
              <td style={{ padding: '12px' }}>{item.price.toLocaleString()} đ</td>
              <td style={{ padding: '12px' }}>{item.stock_quantity}</td>
              <td style={{ padding: '12px', textAlign: 'center' }}>
                
                {/* Nút Sửa */}
                <button 
                  onClick={() => handleEditClick(item)}
                  style={{ backgroundColor: '#ffc107', color: 'black', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginRight: '5px' }}
                >
                  Sửa
                </button>

                {/* Nút Xóa */}
                <button 
                  onClick={() => handleDeleteProduct(item.id)}
                  style={{ backgroundColor: '#ff4d4d', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Xóa
                </button>

              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;