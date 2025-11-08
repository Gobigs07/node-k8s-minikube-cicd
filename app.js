const express = require('express');
const app = express();
const port = 3001;

app.get('/', (req, res) => {
  res.send('Hello from Kubernetes + Minikube!');
});

app.listen(port, () => {
  console.log(`App running on port ${port}`);
});
