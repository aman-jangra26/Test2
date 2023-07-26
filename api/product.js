const express = require('express');
const abc = express.Router();

// Define your route
abc.get('/message', (req, res) => {
  const message = { 
    status: 'success',
    message: 'This is a JSON message from the server!',
  };

  res.json(message);
});

// Export the router
module.exports = abc;
