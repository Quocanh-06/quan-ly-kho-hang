import { useState, useEffect } from 'react';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e) => {
    e.preventDefault(); 
    if (username === 'admin' && password === '123456') {
      setIsLoggedIn(true);
    } else {
      alert("❌ Sai tài khoản hoặc mật khẩu!");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false); setUsername(''); setPassword('');
  };

  const [products, setProducts] = useState([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchProducts = () => {
    fetch('http://localhost:3000/products')
      .then(res => res.json())
      .then(data => setProducts(data))
      .catch(err => console.error("Lỗi kết nối:", err));
  };

  useEffect(() => {
    if (isLoggedIn) fetchProducts();
  }, [isLoggedIn]);

  const handleSubmit = () => {
    if (!name || !price || !stock) return; 
    const payload = { product_name: name, price: Number(price), stock_quantity: Number(stock) };

    if (editingId) {
      fetch(`http://localhost:3000/products/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(() => { fetchProducts(); resetForm(); });
    } else {
      fetch('http://localhost:3000/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(() => { fetchProducts(); resetForm(); });
    }
  };

  const handleEditClick = (item) => {
    setEditingId(item.id); setName(item.product_name); setPrice(item.price); setStock(item.stock_quantity);
  };

  const resetForm = () => {
    setEditingId(null); setName(''); setPrice(''); setStock('');
  };

  const handleDeleteProduct = (id) => {
    setProducts(products.filter(item => item.id !== id));
    fetch(`http://localhost:3000/products/${id}`, { method: 'DELETE' }).catch(() => fetchProducts());
  };

  const filteredProducts = products.filter(item => 
    item.product_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ==========================================
  // THUẬT TOÁN TÍNH THỐNG KÊ (DASHBOARD)
  // ==========================================
  const totalItems = products.length;
  const lowStockItems = products.filter(item => item.stock_quantity < 5).length;
  const totalValue = products.reduce((sum, item) => sum + (item.price * item.stock_quantity), 0);

  if (!isLoggedIn) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f4f7f6', fontFamily: 'sans-serif' }}>
        <form onSubmit={handleLogin} style={{ backgroundColor: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '300px', textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 20px 0' }}>🔒 Hệ Thống Nội Bộ</h2>
          <input type="text" placeholder="Tài khoản..." value={username} onChange={(e) => setUsername(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '15px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }} />
          <input type="password" placeholder="Mật khẩu..." value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '20px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }} />
          <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#007BFF', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Mở Khóa Hệ Thống</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: '30px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>📦 Bảng Điều Khiển Kho Hàng</h2>
        <button onClick={handleLogout} style={{ padding: '8px 15px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Đăng xuất 🚪</button>
      </div>

      {/* MODULE HIỂN THỊ THỐNG KÊ (DASHBOARD) */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <div style={{ flex: 1, backgroundColor: '#e3f2fd', padding: '20px', borderRadius: '8px', borderLeft: '5px solid #2196f3' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#1565c0' }}>Tổng phân loại</h4>
          <h2 style={{ margin: 0 }}>{totalItems} <span style={{ fontSize: '16px', fontWeight: 'normal' }}>mã hàng</span></h2>
        </div>
        
        <div style={{ flex: 1, backgroundColor: lowStockItems > 0 ? '#ffebee' : '#f1f8e9', padding: '20px', borderRadius: '8px', borderLeft: `5px solid ${lowStockItems > 0 ? '#f44336' : '#8bc34a'}` }}>
          <h4 style={{ margin: '0 0 10px 0', color: lowStockItems > 0 ? '#c62828' : '#33691e' }}>Cảnh báo tồn kho (&lt; 5)</h4>
          <h2 style={{ margin: 0 }}>{lowStockItems} <span style={{ fontSize: '16px', fontWeight: 'normal' }}>mặt hàng sắp hết</span></h2>
        </div>

        <div style={{ flex: 1, backgroundColor: '#fff8e1', padding: '20px', borderRadius: '8px', borderLeft: '5px solid #ffc107' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#ff8f00' }}>Ước tính giá trị kho</h4>
          <h2 style={{ margin: 0 }}>{totalValue.toLocaleString()} <span style={{ fontSize: '16px', fontWeight: 'normal' }}>đ</span></h2>
        </div>
      </div>
      
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: editingId ? '#fff3cd' : '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
        <h4 style={{ marginTop: 0 }}>{editingId ? '✏️ Cập Nhật Hàng Hóa' : '➕ Thêm Hàng Mới'}</h4>
        <input type="text" placeholder="Tên sản phẩm..." value={name} onChange={(e) => setName(e.target.value)} style={{ marginRight: '10px', padding: '8px', width: '250px', borderRadius: '4px', border: '1px solid #ccc' }} />
        <input type="number" placeholder="Giá bán (VNĐ)..." value={price} onChange={(e) => setPrice(e.target.value)} style={{ marginRight: '10px', padding: '8px', width: '150px', borderRadius: '4px', border: '1px solid #ccc' }} />
        <input type="number" placeholder="Số lượng..." value={stock} onChange={(e) => setStock(e.target.value)} style={{ marginRight: '10px', padding: '8px', width: '100px', borderRadius: '4px', border: '1px solid #ccc' }} />
        <button onClick={handleSubmit} style={{ padding: '8px 15px', cursor: 'pointer', backgroundColor: editingId ? '#ffc107' : '#4CAF50', color: editingId ? 'black' : 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>{editingId ? 'Lưu thay đổi' : 'Thêm vào kho'}</button>
        {editingId && <button onClick={resetForm} style={{ padding: '8px 15px', cursor: 'pointer', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', marginLeft: '10px' }}>Hủy</button>}
      </div>

      <div style={{ marginBottom: '15px' }}>
        <input type="text" placeholder="🔍 Gõ tên sản phẩm để tìm nhanh..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '12px', boxSizing: 'border-box', borderRadius: '8px', border: '2px solid #007BFF', outline: 'none', fontSize: '15px' }} />
      </div>

      <table border="1" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', backgroundColor: 'white' }}>
        <thead>
          <tr style={{ backgroundColor: '#f2f2f2' }}>
            <th style={{ padding: '12px' }}>Tên sản phẩm</th>
            <th style={{ padding: '12px' }}>Giá bán</th>
            <th style={{ padding: '12px' }}>Tồn kho</th>
            <th style={{ padding: '12px', textAlign: 'center', width: '150px' }}>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {filteredProducts.length > 0 ? (
            filteredProducts.map(item => (
              <tr key={item.id} style={{ backgroundColor: item.stock_quantity < 5 ? '#fff4f4' : 'white' }}>
                <td style={{ padding: '12px', fontWeight: '500' }}>{item.product_name}</td>
                <td style={{ padding: '12px', color: '#28a745', fontWeight: 'bold' }}>{item.price.toLocaleString()} đ</td>
                {/* Bôi đỏ số lượng nếu dưới 5 */}
                <td style={{ padding: '12px', color: item.stock_quantity < 5 ? '#dc3545' : 'inherit', fontWeight: item.stock_quantity < 5 ? 'bold' : 'normal' }}>
                  {item.stock_quantity}
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <button onClick={() => handleEditClick(item)} style={{ backgroundColor: '#ffc107', color: 'black', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginRight: '5px' }}>Sửa</button>
                  <button onClick={() => handleDeleteProduct(item.id)} style={{ backgroundColor: '#ff4d4d', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Xóa</button>
                </td>
              </tr>
            ))
          ) : (
            <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>Không tìm thấy mặt hàng "{searchTerm}"</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default App;