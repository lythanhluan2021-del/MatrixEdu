const http = require('http');

http.get('http://localhost:3000', (res) => {
  console.log('HTTP status:', res.statusCode);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('HTML size received:', data.length);
    console.log('Has app-sidebar:', data.includes('id="app-sidebar"'));
    console.log('Has main-viewport:', data.includes('id="main-viewport"'));
    console.log('Has glass-zone-step-7:', data.includes('glass-zone-step-7'));
    console.log('Has toggleSidebar:', data.includes('function toggleSidebar'));
  });
}).on('error', (err) => console.error('HTTP Error:', err.message));

