import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './FireDataBase'; // initialize Firebase before any screen renders
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
