const res = await fetch('http://localhost:3000/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5174' },
  body: JSON.stringify({ username: 'admin', password: 'MatKhauKhoDoan@2026' }),
});
const data = await res.json();
console.log('LOGIN:', res.status, data.token ? 'TOKEN OK' : JSON.stringify(data));
