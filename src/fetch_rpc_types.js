import https from 'https';

https.get('https://raw.githubusercontent.com/teng-lin/notebooklm-py/main/src/notebooklm/rpc/types.py', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(data.slice(0, 3000)));
});
