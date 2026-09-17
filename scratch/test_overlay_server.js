const http = require('http');

http.get('http://127.0.0.1:8642/overlay', (res) => {
  console.log('GET /overlay status:', res.statusCode);
}).on('error', (err) => {
  console.log('GET /overlay code:', err.code);
});
