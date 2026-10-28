import React, { useState, useEffect, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const PRODUCTS_API = API_URL + '/products';
const ORDERS_API = API_URL + '/orders';
const LOGIN_API = API_URL + '/login';

function App() {
  // ===== AUTH =====
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  // ===== ADMIN NAV =====
  const [adminTab, setAdminTab] = useState('kho'); // 'kho' | 'donhang'

  // ===== PRODUCTS =====
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ===== ADMIN FORM (Thêm/Sửa) =====
  const [formData, setFormData] = useState({ product_name: '', price: '', stock_quantity: '' });
  const [editingId, setEditingId] = useState(null);
  const [adminSearchTerm, setAdminSearchTerm] = useState('');

  // ===== ORDERS =====
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // ===== INVOICE MODAL =====
  const [invoice, setInvoice] = useState(null);

  // ===== HELPERS =====
  const getAuthHeaders = () => {
    const token = sessionStorage.getItem('adminToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const handle401 = (action) => {
    sessionStorage.removeItem('adminToken');
    setIsLoggedIn(false);
    action();
  };

  // ===== FETCH PRODUCTS =====
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(PRODUCTS_API);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      setError('Không thể tải danh sách sản phẩm. Kiểm tra kết nối.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ===== FETCH ORDERS (admin - require token) =====
  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const res = await fetch(ORDERS_API, { headers: getAuthHeaders() });
      if (res.status === 401) {
        handle401(() => setError('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại'));
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      console.error('Fetch orders error:', err);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    // Khôi phục session từ sessionStorage
    const savedToken = sessionStorage.getItem('adminToken');
    if (savedToken) {
      setIsLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) fetchProducts();
  }, [isLoggedIn, fetchProducts]);

  useEffect(() => {
    if (isLoggedIn && adminTab === 'donhang') {
      fetchOrders();
    }
  }, [isLoggedIn, adminTab, fetchOrders]);

  // ===== LOGIN =====
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoggingIn(true);
    try {
      const res = await fetch(LOGIN_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 429) {
        setLoginError(data.error || 'Bạn đã nhập sai quá nhiều lần, vui lòng thử lại sau 5 phút');
        return;
      }
      if (!res.ok) {
        if (data.attemptsLeft !== undefined && data.attemptsLeft > 0) {
          setLoginError(`${data.error}. Còn ${data.attemptsLeft} lần thử`);
        } else {
          setLoginError(data.error || 'Sai tài khoản hoặc mật khẩu');
        }
        return;
      }
      sessionStorage.setItem('adminToken', data.token);
      setIsLoggedIn(true);
      setAdminTab('kho');
    } catch (err) {
      setLoginError('Không thể kết nối server. Kiểm tra kết nối mạng.');
      console.error(err);
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('adminToken');
    setIsLoggedIn(false);
    setUsername('');
    setPassword('');
    setAdminTab('kho');
    setOrders([]);
    setProducts([]);
    setInvoice(null);
  };

  // ===== ADMIN CRUD =====
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const payload = {
      product_name: formData.product_name.trim(),
      price: Number(formData.price),
      stock_quantity: Number(formData.stock_quantity),
    };

    if (!payload.product_name || isNaN(payload.price) || isNaN(payload.stock_quantity)) {
      setError('Vui lòng điền đầy đủ thông tin hợp lệ');
      return;
    }

    try {
      const headers = { 'Content-Type': 'application/json', ...getAuthHeaders() };
      let res;
      if (editingId) {
        res = await fetch(`${PRODUCTS_API}/${editingId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(PRODUCTS_API, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
      }

      if (res.status === 401) {
        handle401(() => setError('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại'));
        return;
      }
      if (!res.ok) throw new Error('Request failed');
      await fetchProducts();
      resetForm();
    } catch (err) {
      setError(editingId ? 'Cập nhật thất bại' : 'Thêm sản phẩm thất bại');
      console.error(err);
    }
  };

  const handleEdit = (product) => {
    setEditingId(product.id);
    setFormData({
      product_name: product.product_name,
      price: product.price,
      stock_quantity: product.stock_quantity,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa sản phẩm này?')) return;
    setError('');
    try {
      const res = await fetch(`${PRODUCTS_API}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.status === 401) {
        handle401(() => setError('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại'));
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Delete failed');
      }
      await fetchProducts();
    } catch (err) {
      setError(err.message || 'Xóa sản phẩm thất bại');
      console.error(err);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ product_name: '', price: '', stock_quantity: '' });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ===== INVOICE =====
  const handleViewInvoice = (order) => {
    setInvoice(order);
  };
  const closeInvoice = () => setInvoice(null);

  // ===== HELPERS =====
  const formatCurrency = (num) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);

  const formatDate = (iso) =>
    new Date(iso).toLocaleString('vi-VN', { hour12: false });

  const invoiceNumber = (id) => `#HD-${String(id).padStart(4, '0')}`;

  const adminFilteredProducts = products.filter(p =>
    p.product_name.toLowerCase().includes(adminSearchTerm.toLowerCase())
  );

  // ===== STATS =====
  const totalProducts = products.length;
  const lowStockCount = products.filter(p => p.stock_quantity < 5).length;
  const totalValue = products.reduce((sum, p) => sum + p.price * p.stock_quantity, 0);

  // =====================
  // LOGIN SCREEN
  // =====================
  if (!isLoggedIn) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginBox}>
          <h2 style={styles.loginTitle}>🔐 Đăng nhập Quản trị</h2>
          {loginError && <div style={styles.errorMsg}>{loginError}</div>}
          <form onSubmit={handleLogin} style={styles.loginForm}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Tài khoản</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Nhập tên tài khoản..."
                    autoComplete="username"
                    style={styles.input}
                    autoFocus
                  />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Mật khẩu</label>
              <div style={styles.passwordWrapper}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                  autoComplete="current-password"
                  style={{ ...styles.input, ...styles.passwordInput }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  tabIndex={-1}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loggingIn} style={styles.loginBtn}>
              {loggingIn ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // =====================
  // MAIN ADMIN APP
  // =====================
  return (
    <div style={styles.app}>
      {/* ===== HEADER ===== */}
      <header style={styles.header}>
        <h1 style={styles.headerTitle}>📦 Quản trị Kho & Đơn hàng</h1>
        <button onClick={handleLogout} style={styles.logoutBtn}>Đăng xuất</button>
      </header>

      <main style={styles.main}>
        {/* Admin sub-tabs */}
        <div style={styles.adminTabs}>
          <button
            onClick={() => setAdminTab('kho')}
            style={adminTab === 'kho' ? styles.adminTabActive : styles.adminTab}
          >
            📦 Quản lý Kho
          </button>
          <button
            onClick={() => setAdminTab('donhang')}
            style={adminTab === 'donhang' ? styles.adminTabActive : styles.adminTab}
          >
            📋 Lịch sử Đơn hàng {orders.length > 0 && `(${orders.length})`}
          </button>
        </div>

        {/* ===== TAB: QUẢN LÝ KHO ===== */}
        {adminTab === 'kho' && (
          <>
            <section style={styles.dashboard}>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Tổng số mã hàng</div>
                <div style={{ ...styles.statValue, color: '#3b82f6' }}>{totalProducts}</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Cảnh báo tồn kho (dưới 5)</div>
                <div style={{ ...styles.statValue, color: '#ef4444' }}>{lowStockCount}</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Tổng giá trị kho</div>
                <div style={{ ...styles.statValue, color: '#22c55e' }}>{formatCurrency(totalValue)}</div>
              </div>
            </section>

            <section style={styles.card}>
              <div style={styles.cardHeader}>
                <h2 style={styles.cardTitle}>Danh sách sản phẩm</h2>
                <input
                  type="text"
                  placeholder="🔍 Tìm kiếm theo tên..."
                  value={adminSearchTerm}
                  onChange={(e) => setAdminSearchTerm(e.target.value)}
                  style={styles.searchInput}
                />
              </div>

              {error && <div style={styles.errorBanner}>{error}</div>}

              <div style={styles.tableWrapper}>
                {loading ? (
                  <div style={styles.loading}>Đang tải...</div>
                ) : adminFilteredProducts.length === 0 ? (
                  <div style={styles.emptyState}>
                    {adminSearchTerm ? 'Không tìm thấy sản phẩm phù hợp' : 'Chưa có sản phẩm nào. Hãy thêm mới!'}
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th style={styles.colId}>ID</th>
                        <th>Tên mặt hàng</th>
                        <th style={styles.colNumber}>Giá bán</th>
                        <th style={styles.colNumber}>Tồn kho</th>
                        <th style={styles.colNumber}>Thành tiền</th>
                        <th style={styles.colAction}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminFilteredProducts.map((product) => (
                        <tr key={product.id} className={product.stock_quantity < 5 ? 'low-stock' : ''}>
                          <td style={styles.colId}>{product.id}</td>
                          <td>{product.product_name}</td>
                          <td style={styles.colNumber}>{formatCurrency(product.price)}</td>
                          <td style={styles.colNumber}>
                            <span style={product.stock_quantity < 5 ? styles.lowStockBadge : {}}>{product.stock_quantity}</span>
                          </td>
                          <td style={styles.colNumber}>{formatCurrency(product.price * product.stock_quantity)}</td>
                          <td style={styles.colAction}>
                            <button onClick={() => handleEdit(product)} style={styles.btnEdit}>Sửa</button>
                            <button onClick={() => handleDelete(product.id)} style={styles.btnDelete}>Xóa</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>

            <section style={styles.card}>
              <h2 style={styles.cardTitle}>{editingId ? '✏️ Chỉnh sửa sản phẩm' : '➕ Thêm sản phẩm mới'}</h2>
              <form onSubmit={handleSubmit} style={styles.form}>
                <div style={styles.formRow}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Tên mặt hàng</label>
                    <input
                      type="text"
                      name="product_name"
                      value={formData.product_name}
                      onChange={handleChange}
                      placeholder="VD: Chảo từ, Thớt nghiến..."
                      style={styles.input}
                      required
                    />
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Giá bán (VNĐ)</label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      placeholder="0"
                      style={styles.input}
                      min="0"
                      required
                    />
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Số lượng tồn kho</label>
                    <input
                      type="number"
                      name="stock_quantity"
                      value={formData.stock_quantity}
                      onChange={handleChange}
                      placeholder="0"
                      style={styles.input}
                      min="0"
                      required
                    />
                  </div>
                </div>
                <div style={styles.formActions}>
                  <button type="submit" style={editingId ? styles.btnSave : styles.btnAdd}>
                    {editingId ? '💾 Lưu thay đổi' : '➕ Thêm sản phẩm'}
                  </button>
                  {editingId && (
                    <button type="button" onClick={resetForm} style={styles.btnCancel}>Hủy</button>
                  )}
                </div>
              </form>
            </section>
          </>
        )}

        {/* ===== TAB: LỊCH SỬ ĐƠN HÀNG ===== */}
        {adminTab === 'donhang' && (
          <section style={styles.card}>
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>📋 Lịch sử Đơn hàng</h2>
              <button onClick={fetchOrders} style={styles.btnRefresh}>🔄 Làm mới</button>
            </div>

            <div style={styles.tableWrapper}>
              {ordersLoading ? (
                <div style={styles.loading}>Đang tải đơn hàng...</div>
              ) : orders.length === 0 ? (
                <div style={styles.emptyState}>Chưa có đơn hàng nào</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th style={styles.colOrderId}>Mã đơn</th>
                      <th>Tên khách</th>
                      <th>SĐT</th>
                      <th>Ngày đặt</th>
                      <th style={styles.colNumber}>Tổng tiền</th>
                      <th style={styles.colAction}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id}>
                        <td style={styles.colOrderId}>{invoiceNumber(order.id)}</td>
                        <td>{order.customer_name}</td>
                        <td>{order.customer_phone}</td>
                        <td>{formatDate(order.created_at)}</td>
                        <td style={styles.colNumber}>{formatCurrency(order.total_amount)}</td>
                        <td style={styles.colAction}>
                          <button onClick={() => handleViewInvoice(order)} style={styles.btnInvoice}>
                            🧾 Xem & In Hóa đơn
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        )}
      </main>

      {/* ===== INVOICE MODAL ===== */}
      {invoice && (
        <div style={styles.modalOverlay} onClick={closeInvoice}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div id="invoice-print" style={styles.invoice}>
              <div style={styles.invoiceHeader}>
                <div style={styles.invoiceHeaderLeft}>
                  <div style={styles.invoiceStoreName}>Cửa hàng Gia dụng</div>
                  <div style={styles.invoiceStoreSub}>Hóa đơn bán hàng điện tử</div>
                </div>
                <div style={styles.invoiceHeaderRight}>
                  <div style={styles.invoiceTitle}>HÓA ĐƠN BÁN HÀNG</div>
                  <div style={styles.invoiceMeta}>Mã hóa đơn: {invoiceNumber(invoice.id)}</div>
                  <div style={styles.invoiceMeta}>Ngày giờ xuất: {formatDate(invoice.created_at)}</div>
                </div>
              </div>

              <div style={styles.invoiceSection}>
                <div style={styles.invoiceSectionTitle}>Thông tin khách hàng</div>
                <div style={styles.invoiceCustomer}>
                  <div><strong>Họ tên:</strong> {invoice.customer_name}</div>
                  <div><strong>Số điện thoại:</strong> {invoice.customer_phone}</div>
                  <div><strong>Địa chỉ:</strong> {invoice.customer_address || '—'}</div>
                </div>
              </div>

              <div style={styles.invoiceSection}>
                <table style={styles.invoiceTable}>
                  <thead>
                    <tr>
                      <th style={styles.invoiceThSTT}>STT</th>
                      <th>Tên mặt hàng</th>
                      <th style={styles.invoiceThNum}>Số lượng</th>
                      <th style={styles.invoiceThNum}>Đơn giá</th>
                      <th style={styles.invoiceThNum}>Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(invoice.items || []).map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td style={styles.invoiceTdSTT}>{idx + 1}</td>
                        <td>{item.product_name}</td>
                        <td style={styles.invoiceTdNum}>{item.quantity}</td>
                        <td style={styles.invoiceTdNum}>{formatCurrency(item.price)}</td>
                        <td style={styles.invoiceTdNum}>{formatCurrency(item.price * item.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={styles.invoiceSummaryBox}>
                <div style={styles.invoiceSummaryRow}><span>Tổng tiền hàng:</span><span>{formatCurrency(invoice.total_amount)}</span></div>
                <div style={styles.invoiceSummaryRow}><span>Tiền cọc đã thu (10%, tối đa 1.500.000đ):</span><span>{formatCurrency(Math.min(Math.round(Number(invoice.total_amount) * 0.1), 1500000))}</span></div>
                <div style={styles.invoiceSummaryRow}><span>Còn lại thanh toán khi nhận hàng:</span><span>{formatCurrency(Number(invoice.total_amount) - Math.min(Math.round(Number(invoice.total_amount) * 0.1), 1500000))}</span></div>
              </div>

              <div style={styles.invoiceTotal}>
                <div style={styles.invoiceTotalLabel}>TỔNG CỘNG TIỀN THANH TOÁN:</div>
                <div style={styles.invoiceTotalValue}>{formatCurrency(invoice.total_amount)}</div>
              </div>

              <div style={styles.invoicePaymentBox}>
                <div style={styles.invoicePaymentTitle}>Thông tin tài khoản nhận tiền</div>
                <div style={styles.invoicePaymentRow}><span>Ngân hàng:</span><strong>MB Bank</strong></div>
                <div style={styles.invoicePaymentRow}><span>Chủ tài khoản:</span><strong>VŨ THỊ DUNG</strong></div>
                <div style={styles.invoicePaymentRow}><span>Số tài khoản:</span><strong>0947386681</strong></div>
                <div style={styles.invoiceDepositNote}>* Vui lòng chuyển tiền cọc 10% trước khi nhận hàng. Thanh toán số còn lại khi nhận đơn.</div>
              </div>

              <div style={styles.invoiceFooter}>
                Cảm ơn quý khách đã mua hàng tại Cửa hàng Gia dụng!
              </div>
            </div>

            <div style={styles.modalActions}>
              <button onClick={() => window.print()} style={styles.btnPrint}>🖨️ In Hóa đơn / Lưu PDF</button>
              <button onClick={closeInvoice} style={styles.btnCancel}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  // ===== LOGIN =====
  loginContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
  },
  loginBox: {
    background: 'white',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
    width: '100%',
    maxWidth: '400px',
  },
  loginTitle: {
    marginBottom: '24px',
    color: '#1f2937',
    textAlign: 'center',
    fontSize: '24px',
  },
  errorMsg: {
    background: '#fef2f2',
    color: '#dc2626',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '16px',
    fontSize: '14px',
    textAlign: 'center',
  },
  loginForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '15px',
  },
  loginBtn: {
    background: '#3b82f6',
    color: 'white',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '15px',
    fontWeight: 600,
    marginTop: '8px',
  },
  passwordWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  passwordInput: {
    width: '100%',
    paddingRight: '44px',
  },
  eyeBtn: {
    position: 'absolute',
    right: '6px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'transparent',
    padding: '4px 6px',
    fontSize: '16px',
    lineHeight: 1,
  },

  // ===== APP LAYOUT =====
  app: {
    minHeight: '100vh',
    background: '#f3f4f6',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 24px',
    background: 'white',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  headerTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#1f2937',
  },
  logoutBtn: {
    background: '#ef4444',
    color: 'white',
    padding: '8px 16px',
  },
  main: {
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
  },

  // ===== ADMIN TABS =====
  adminTabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    background: 'white',
    padding: '6px',
    borderRadius: '10px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    width: 'fit-content',
  },
  adminTab: {
    background: 'transparent',
    color: '#6b7280',
    padding: '10px 20px',
    borderRadius: '6px',
    fontSize: '15px',
    fontWeight: 500,
  },
  adminTabActive: {
    background: '#3b82f6',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '6px',
    fontSize: '15px',
    fontWeight: 600,
  },

  // ===== DASHBOARD =====
  dashboard: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    borderLeft: '4px solid',
  },
  statLabel: {
    fontSize: '13px',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '8px',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 700,
  },

  // ===== CARD =====
  card: {
    background: 'white',
    borderRadius: '10px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    marginBottom: '24px',
    overflow: 'hidden',
    padding: '20px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '16px',
  },
  errorBanner: {
    background: '#fef2f2',
    color: '#dc2626',
    padding: '12px 16px',
    borderRadius: '6px',
    border: '1px solid #fecaca',
    fontSize: '14px',
    marginBottom: '16px',
  },
  searchInput: {
    width: '100%',
    maxWidth: '300px',
    padding: '8px 12px',
  },
  loading: {
    padding: '40px',
    textAlign: 'center',
    color: '#6b7280',
  },
  emptyState: {
    padding: '40px',
    textAlign: 'center',
    color: '#9ca3af',
  },

  // ===== TABLE =====
  tableWrapper: {
    overflowX: 'auto',
  },
  colId: { width: '60px' },
  colOrderId: { width: '100px' },
  colNumber: { width: '140px' },
  colAction: { width: '200px', whiteSpace: 'nowrap' },
  lowStockBadge: {
    color: '#dc2626',
    fontWeight: 600,
  },
  btnEdit: {
    background: '#3b82f6',
    color: 'white',
    padding: '6px 12px',
    marginRight: '8px',
    fontSize: '13px',
  },
  btnDelete: {
    background: '#ef4444',
    color: 'white',
    padding: '6px 12px',
    fontSize: '13px',
  },
  btnInvoice: {
    background: '#f59e0b',
    color: 'white',
    padding: '6px 12px',
    fontSize: '13px',
  },
  btnRefresh: {
    background: '#6b7280',
    color: 'white',
    padding: '6px 12px',
    fontSize: '13px',
  },

  // ===== ADMIN FORM =====
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  formActions: {
    display: 'flex',
    gap: '12px',
  },
  btnAdd: {
    background: '#22c55e',
    color: 'white',
    padding: '10px 20px',
  },
  btnSave: {
    background: '#f59e0b',
    color: 'white',
    padding: '10px 20px',
  },
  btnCancel: {
    background: '#9ca3af',
    color: 'white',
    padding: '10px 20px',
  },

  // ===== INVOICE MODAL =====
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modalContent: {
    background: 'white',
    borderRadius: '12px',
    maxWidth: '700px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    padding: '24px',
  },
  invoice: {
    border: '2px solid #1f2937',
    borderRadius: '8px',
    padding: '32px',
    background: 'white',
  },
  invoiceHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    borderBottom: '2px solid #1f2937',
    paddingBottom: '16px',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  invoiceHeaderLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  invoiceStoreName: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#1f2937',
  },
  invoiceStoreSub: {
    fontSize: '13px',
    color: '#6b7280',
  },
  invoiceHeaderRight: {
    textAlign: 'right',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  invoiceTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#dc2626',
    textTransform: 'uppercase',
  },
  invoiceMeta: {
    fontSize: '13px',
    color: '#374151',
  },
  invoiceSection: {
    marginBottom: '20px',
  },
  invoiceSectionTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#1f2937',
    textTransform: 'uppercase',
    marginBottom: '8px',
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: '4px',
  },
  invoiceCustomer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: '14px',
    color: '#374151',
  },
  invoiceTable: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  invoiceThSTT: {
    width: '50px',
    textAlign: 'center',
    background: '#f3f4f6',
    border: '1px solid #d1d5db',
    padding: '8px',
    fontSize: '13px',
    fontWeight: 700,
  },
  invoiceThNum: {
    width: '130px',
    textAlign: 'right',
    background: '#f3f4f6',
    border: '1px solid #d1d5db',
    padding: '8px',
    fontSize: '13px',
    fontWeight: 700,
  },
  invoiceTdSTT: {
    textAlign: 'center',
    border: '1px solid #d1d5db',
    padding: '8px',
    fontSize: '13px',
  },
  invoiceTdNum: {
    textAlign: 'right',
    border: '1px solid #d1d5db',
    padding: '8px',
    fontSize: '13px',
  },
  invoiceSummaryBox: {
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px 20px',
    marginBottom: '20px',
  },
  invoiceSummaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '14px',
    color: '#374151',
    padding: '4px 0',
    borderBottom: '1px solid #e5e7eb',
  },
  invoiceTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#fef3c7',
    border: '2px solid #f59e0b',
    borderRadius: '8px',
    padding: '16px 20px',
    marginTop: '20px',
    flexWrap: 'wrap',
    gap: '8px',
  },
  invoiceTotalLabel: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#92400e',
  },
  invoiceTotalValue: {
    fontSize: '24px',
    fontWeight: 800,
    color: '#dc2626',
  },
  invoicePaymentBox: {
    background: '#eff6ff',
    border: '2px dashed #3b82f6',
    borderRadius: '8px',
    padding: '16px 20px',
    marginTop: '20px',
    marginBottom: '20px',
  },
  invoicePaymentTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#1d4ed8',
    marginBottom: '8px',
  },
  invoicePaymentRow: {
    display: 'flex',
    gap: '20px',
    fontSize: '14px',
    color: '#374151',
    marginBottom: '4px',
  },
  invoiceDepositNote: {
    marginTop: '8px',
    fontSize: '12px',
    color: '#6b7280',
    fontStyle: 'italic',
  },
  invoiceFooter: {
    textAlign: 'center',
    marginTop: '24px',
    fontStyle: 'italic',
    color: '#6b7280',
    fontSize: '14px',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    marginTop: '20px',
  },
  btnPrint: {
    background: '#3b82f6',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 700,
  },
};

export default App;