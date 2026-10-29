import React, { useState, useEffect, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const PRODUCTS_API = API_URL + '/products';
const ORDERS_API = API_URL + '/orders';

function App() {
  // ===== PRODUCTS =====
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ===== STORE =====
  const [searchTerm, setSearchTerm] = useState('');

  // ===== CART =====
  const [cart, setCart] = useState([]);

  // ===== CHECKOUT =====
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [orderSuccessMsg, setOrderSuccessMsg] = useState('');

  // ===== INVOICE MODAL =====
  const [invoice, setInvoice] = useState(null);

  // ===== FETCH PRODUCTS (API công khai - khách hàng xem hàng) =====
  const fetchProducts = useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(PRODUCTS_API, { signal });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError('Không thể tải danh sách sản phẩm. Kiểm tra kết nối.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchProducts(controller.signal);
    return () => controller.abort();
  }, [fetchProducts]);

  // ===== CART =====
  const addToCart = (product) => {
    setError('');
    setOrderSuccessMsg('');
    if (product.stock_quantity === 0) return;
    const existing = cart.find(item => item.product_id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock_quantity) {
        setError(`Sản phẩm "${product.product_name}" chỉ còn ${product.stock_quantity} trong kho`);
        return;
      }
      setCart(cart.map(item =>
        item.product_id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        product_id: product.id,
        product_name: product.product_name,
        price: Number(product.price),
        quantity: 1,
      }]);
    }
  };

  const updateQuantity = (product_id, delta) => {
    setError('');
    const item = cart.find(i => i.product_id === product_id);
    if (!item) return;
    const product = products.find(p => p.id === product_id);
    const maxStock = product ? product.stock_quantity : item.quantity;
    const newQty = item.quantity + delta;
    if (newQty > maxStock) {
      setError(`Số lượng vượt quá tồn kho (tối đa ${maxStock})`);
      return;
    }
    if (newQty <= 0) {
      setCart(cart.filter(i => i.product_id !== product_id));
    } else {
      setCart(cart.map(i => i.product_id === product_id ? { ...i, quantity: newQty } : i));
    }
  };

  // Nhập số lượng trực tiếp (tay gõ) - không bị giới hạn bởi số lần click +
  const updateQuantityDirect = (product_id, value) => {
    setError('');
    const item = cart.find(i => i.product_id === product_id);
    if (!item) return;
    const product = products.find(p => p.id === product_id);
    const maxStock = product ? product.stock_quantity : item.quantity;
    let newQty = parseInt(value, 10);
    if (isNaN(newQty) || newQty <= 0) {
      setCart(cart.filter(i => i.product_id !== product_id));
      return;
    }
    if (newQty > maxStock) {
      newQty = maxStock;
      setError(`Sản phẩm "${item.product_name}" chỉ còn ${maxStock} trong kho, đã đặt tối đa`);
    }
    setCart(cart.map(i => i.product_id === product_id ? { ...i, quantity: newQty } : i));
  };

  const removeFromCart = (product_id) => {
    setCart(cart.filter(i => i.product_id !== product_id));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // ===== CHECKOUT (API công khai - khách hàng đặt hàng) =====
  const handleCheckout = async (e) => {
    e.preventDefault();
    setError('');
    setOrderSuccessMsg('');
    if (cart.length === 0) {
      setError('Giỏ hàng trống. Hãy thêm sản phẩm trước khi đặt hàng');
      return;
    }
    if (!customerName.trim() || !customerPhone.trim()) {
      setError('Vui lòng nhập họ tên và số điện thoại khách hàng');
      return;
    }
    try {
      const res = await fetch(ORDERS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          customer_address: customerAddress.trim(),
          items: cart.map(item => ({
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            price: item.price,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Đặt hàng thất bại');
        return;
      }
      // Hiển thị hóa đơn điện tử
      setInvoice(data);
      // Reset form + giỏ hàng
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setOrderSuccessMsg('Đặt hàng thành công! Hóa đơn đang hiển thị bên dưới.');
      await fetchProducts(); // cập nhật tồn kho mới
    } catch (err) {
      setError('Đặt hàng thất bại. Kiểm tra kết nối mạng.');
      console.error(err);
    }
  };

  const closeInvoice = () => {
    setInvoice(null);
  };

  // ===== HELPERS =====
  const formatCurrency = (num) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);

  const formatDate = (iso) =>
    new Date(iso).toLocaleString('vi-VN', { hour12: false });

  const invoiceNumber = (id) => `#HD-${String(id).padStart(4, '0')}`;

  // ===== FILTERS =====
  const filteredProducts = products.filter(p =>
    p.product_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const depositAmount = Math.min(Math.round(cartTotal * 0.1), 1500000);

  return (
    <div style={styles.app}>
      {/* ===== HEADER ===== */}
      <header style={styles.header}>
        <h1 style={styles.headerTitle}>🏪 Cửa hàng Gia dụng</h1>
        <div style={styles.cartMiniBadge} onClick={() => setInvoice(null)}>
          🛒 Giỏ hàng: {cartCount} món - {formatCurrency(cartTotal)}
        </div>
      </header>

      {error && <div style={styles.errorBanner}>{error}</div>}
      {orderSuccessMsg && <div style={styles.successBanner}>{orderSuccessMsg}</div>}

      <main style={styles.main}>
        {/* ===== PRODUCT LIST ===== */}
        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>🛒 Danh sách sản phẩm</h2>
            <input
              type="text"
              placeholder="🔍 Tìm sản phẩm theo tên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
              onFocus={() => setOrderSuccessMsg('')}
            />
          </div>

          {loading ? (
            <div style={styles.loading}>Đang tải sản phẩm...</div>
          ) : filteredProducts.length === 0 ? (
            <div style={styles.emptyState}>
              {searchTerm ? 'Không tìm thấy sản phẩm phù hợp' : 'Chưa có sản phẩm nào'}
            </div>
          ) : (
            <div style={styles.productGrid}>
              {filteredProducts.map(product => (
                <div key={product.id} style={styles.productCard}>
                  <div style={styles.productCardBody}>
                    <div style={styles.productName}>{product.product_name}</div>
                    <div style={styles.productPrice}>{formatCurrency(product.price)}</div>
                    <div style={styles.productStock}>
                      {product.stock_quantity === 0 ? (
                        <span style={styles.outOfStockBadge}>Hết hàng</span>
                      ) : (
                        <span style={styles.inStockText}>Còn: {product.stock_quantity}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => addToCart(product)}
                    disabled={product.stock_quantity === 0}
                    style={product.stock_quantity === 0 ? styles.btnOutOfStock : styles.btnAddToCart}
                  >
                    {product.stock_quantity === 0 ? 'Hết hàng' : 'Thêm vào giỏ'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ===== CART + CHECKOUT ===== */}
        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>🛍️ Giỏ hàng {cartCount > 0 && `(${cartCount})`}</h2>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} style={styles.btnClearCart}>Xóa giỏ hàng</button>
            )}
          </div>

          {cart.length === 0 ? (
            <div style={styles.emptyState}>Giỏ hàng trống. Hãy thêm sản phẩm từ danh sách bên trên!</div>
          ) : (
            <div className="cart-layout" style={styles.cartLayout}>
              <div style={styles.cartList}>
                {cart.map(item => {
                  const product = products.find(p => p.id === item.product_id);
                  const maxStock = product ? product.stock_quantity : item.quantity;
                  return (
                    <div key={item.product_id} style={styles.cartItem}>
                      <div style={styles.cartItemInfo}>
                        <div style={styles.cartItemName}>{item.product_name}</div>
                        <div style={styles.cartItemPrice}>{formatCurrency(item.price)} / cái</div>
                      </div>
                      <div style={styles.cartItemControls}>
                        <button onClick={() => updateQuantity(item.product_id, -1)} style={styles.qtyBtn}>−</button>
                        <input
                          type="number"
                          min="1"
                          max={maxStock}
                          value={item.quantity}
                          onChange={(e) => updateQuantityDirect(item.product_id, e.target.value)}
                          style={styles.qtyInput}
                        />
                        <button onClick={() => updateQuantity(item.product_id, 1)} style={styles.qtyBtn}>+</button>
                      </div>
                      <div style={styles.cartItemTotal}>{formatCurrency(item.price * item.quantity)}</div>
                      <button onClick={() => removeFromCart(item.product_id)} style={styles.btnRemoveItem}>✕</button>
                    </div>
                  );
                })}
              </div>

              {/* Checkout form */}
              <form onSubmit={handleCheckout} style={styles.checkoutForm}>
                <h3 style={styles.checkoutTitle}>📋 Thông tin đặt hàng</h3>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Họ tên khách hàng *</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="VD: Nguyễn Văn A"
                      autoComplete="name"
                      style={styles.input}
                      required
                    />
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Số điện thoại *</label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="VD: 0909123456"
                      autoComplete="tel"
                      style={styles.input}
                      required
                    />
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Địa chỉ giao hàng</label>
                    <input
                      type="text"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="VD: 123 Đường 3/2, P.X, Q.Y"
                      autoComplete="address-line1"
                      style={styles.input}
                    />
                </div>
                <div style={styles.cartSummary}>
                  <div style={styles.cartSummaryRow}>
                    <span>Tổng tiền hàng:</span>
                    <span>{formatCurrency(cartTotal)}</span>
                  </div>
                  <div style={styles.cartSummaryRow}>
                    <span>Tiền cọc (10%, tối đa 1.500.000đ):</span>
                    <span style={{ color: '#059669', fontWeight: 700 }}>{formatCurrency(depositAmount)}</span>
                  </div>
                  <div style={styles.cartSummaryRow}>
                    <span>Còn lại thanh toán khi nhận hàng:</span>
                    <span style={{ color: '#dc2626', fontWeight: 700 }}>{formatCurrency(cartTotal - depositAmount)}</span>
                  </div>
                </div>
                <button type="submit" style={styles.btnCheckout}>🧾 Đặt hàng & Xuất hóa đơn</button>
              </form>
            </div>
          )}
        </section>
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
    flexWrap: 'wrap',
    gap: '12px',
  },
  headerTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#1f2937',
  },
  cartMiniBadge: {
    background: '#eff6ff',
    color: '#1d4ed8',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'default',
  },
  main: {
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
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
    padding: '12px 20px',
    margin: '0 auto 16px',
    maxWidth: '1200px',
    borderRadius: '6px',
    border: '1px solid #fecaca',
    fontSize: '14px',
  },
  successBanner: {
    background: '#f0fdf4',
    color: '#16a34a',
    padding: '12px 20px',
    margin: '0 auto 16px',
    maxWidth: '1200px',
    borderRadius: '6px',
    border: '1px solid #bbf7d0',
    fontSize: '14px',
    fontWeight: 600,
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

  // Product Grid
  productGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '16px',
  },
  productCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    background: 'white',
  },
  productCardBody: {
    padding: '16px',
    flex: 1,
  },
  productName: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '8px',
    minHeight: '40px',
  },
  productPrice: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#dc2626',
    marginBottom: '8px',
  },
  productStock: {
    fontSize: '13px',
    color: '#6b7280',
  },
  inStockText: {
    color: '#16a34a',
    fontWeight: 500,
  },
  outOfStockBadge: {
    background: '#ef4444',
    color: 'white',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
  },
  btnAddToCart: {
    background: '#22c55e',
    color: 'white',
    padding: '10px',
    borderRadius: '0',
    fontSize: '14px',
    fontWeight: 600,
  },
  btnOutOfStock: {
    background: '#d1d5db',
    color: '#6b7280',
    padding: '10px',
    borderRadius: '0',
    fontSize: '14px',
    fontWeight: 600,
  },

  // Cart
  cartLayout: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 1fr',
    gap: '24px',
  },
  cartList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  cartItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    flexWrap: 'wrap',
  },
  cartItemInfo: {
    flex: 1,
    minWidth: '150px',
  },
  cartItemName: {
    fontWeight: 600,
    color: '#1f2937',
    fontSize: '14px',
  },
  cartItemPrice: {
    fontSize: '13px',
    color: '#6b7280',
    marginTop: '2px',
  },
  cartItemControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  qtyBtn: {
    background: '#e5e7eb',
    color: '#1f2937',
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: 700,
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyInput: {
    width: '44px',
    height: '28px',
    textAlign: 'center',
    fontSize: '14px',
    fontWeight: 600,
    border: '1px solid #d1d5db',
    borderRadius: '6px',
  },
  cartItemTotal: {
    fontWeight: 700,
    color: '#dc2626',
    minWidth: '110px',
    textAlign: 'right',
  },
  btnRemoveItem: {
    background: '#fee2e2',
    color: '#dc2626',
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    fontSize: '14px',
    padding: 0,
  },
  btnClearCart: {
    background: '#9ca3af',
    color: 'white',
    padding: '6px 12px',
    fontSize: '13px',
  },

  // Checkout
  checkoutForm: {
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    height: 'fit-content',
  },
  checkoutTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '4px',
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
  cartSummary: {
    background: '#f9fafb',
    borderRadius: '8px',
    padding: '14px',
    marginTop: '4px',
  },
  cartSummaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '14px',
    color: '#374151',
    padding: '4px 0',
    borderBottom: '1px solid #e5e7eb',
  },
  btnCheckout: {
    background: '#f59e0b',
    color: 'white',
    padding: '14px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 700,
    marginTop: '4px',
  },

  // Invoice Modal
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
  btnCancel: {
    background: '#9ca3af',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '8px',
  },
};

export default App;